import { KeitoHttpClient, KeitoHttpOptions } from "./http";
import { NameLookup, normalizeIdentity, normalizeProject, normalizeTask, normalizeTimeEntry } from "./normalize";
import {
  KeitoIdentity,
  Project,
  RawCurrentUser,
  RawProject,
  RawTask,
  RawTimeEntry,
  Task,
  TimeEntry,
  TimeEntryCreateBody,
  TimeEntryUpdateBody,
} from "./types";
import { KeitoError } from "./errors";

function defined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/** Typed Keito API v2 adapter for the endpoints this extension uses. */
export class KeitoApi {
  readonly http: KeitoHttpClient;

  constructor(private readonly options: KeitoHttpOptions) {
    this.http = new KeitoHttpClient(options);
  }

  /** GET /users/me — verifies the key, the Company ID, and the credential type. */
  async getIdentity(): Promise<KeitoIdentity> {
    const { data, features } = await this.http.request<RawCurrentUser>("GET", "/users/me");
    return this.options.auth?.kind === "oauth"
      ? normalizeIdentity(data ?? {}, undefined, features, "oauth")
      : normalizeIdentity(data ?? {}, this.options.accountId, features);
  }

  /** Active projects visible to the bound identity. */
  async listProjects(): Promise<Project[]> {
    const raw = await this.http.paginate<RawProject>("/projects", "projects", { is_active: true });
    return raw.map(normalizeProject).filter(defined);
  }

  /** Active tasks assigned to one project. Keito validates task/project pairs on create. */
  async listProjectTasks(projectId: string): Promise<Task[]> {
    if (!projectId) return [];
    const raw = await this.http.paginate<RawTask>("/tasks", "tasks", { project_id: projectId, is_active: true });
    return raw.map(normalizeTask).filter(defined);
  }

  async listTimeEntries(
    params: { userId: string; from: string; to: string; isRunning?: boolean },
    lookup?: NameLookup,
  ): Promise<TimeEntry[]> {
    const raw = await this.http.paginate<RawTimeEntry>("/time_entries", "time_entries", {
      user_id: params.userId,
      from: params.from,
      to: params.to,
      is_running: params.isRunning,
    });
    return raw.map((entry) => normalizeTimeEntry(entry, lookup));
  }

  async listRunningEntries(userId: string, lookup?: NameLookup): Promise<TimeEntry[]> {
    const raw = await this.http.paginate<RawTimeEntry>("/time_entries", "time_entries", {
      user_id: userId,
      is_running: true,
    });
    // Defensive: never treat a stopped entry as running even if a filter is ignored.
    return raw.map((entry) => normalizeTimeEntry(entry, lookup)).filter((entry) => entry.isRunning);
  }

  async createTimeEntry(body: TimeEntryCreateBody, lookup?: NameLookup): Promise<TimeEntry> {
    if (body.is_running && body.hours !== undefined) {
      throw new KeitoError("validation", "A running timer cannot also have a duration.");
    }
    if (body.replace_running && !body.is_running) {
      throw new KeitoError("validation", "replace_running is only valid when starting a timer.");
    }
    const { data } = await this.http.request<RawTimeEntry>("POST", "/time_entries", { body });
    return normalizeTimeEntry(data, lookup);
  }

  async updateTimeEntry(id: string, body: TimeEntryUpdateBody, lookup?: NameLookup): Promise<TimeEntry> {
    if (Object.keys(body).length === 0) throw new KeitoError("validation", "Nothing to update.");
    const { data } = await this.http.request<RawTimeEntry>("PATCH", `/time_entries/${encodeURIComponent(id)}`, {
      body,
    });
    return normalizeTimeEntry(data, lookup);
  }

  async stopTimeEntry(id: string, lookup?: NameLookup): Promise<TimeEntry | undefined> {
    const { data } = await this.http.request<RawTimeEntry>("PATCH", `/time_entries/${encodeURIComponent(id)}/stop`);
    return data ? normalizeTimeEntry(data, lookup) : undefined;
  }

  async restartTimeEntry(id: string, options: { replaceRunning?: boolean } = {}, lookup?: NameLookup) {
    const { data } = await this.http.request<RawTimeEntry>("PATCH", `/time_entries/${encodeURIComponent(id)}/restart`, {
      body: options.replaceRunning ? { replace_running: true } : undefined,
    });
    return data ? normalizeTimeEntry(data, lookup) : undefined;
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await this.http.request("DELETE", `/time_entries/${encodeURIComponent(id)}`);
  }
}

export function buildLookup(projects: Project[] = [], tasks: Task[] = []): NameLookup {
  return {
    projects: new Map(projects.map((p) => [p.id, p])),
    tasks: new Map(tasks.map((t) => [t.id, t])),
  };
}
