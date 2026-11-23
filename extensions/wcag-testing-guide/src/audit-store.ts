/** Serialized local persistence shared by every pushed audit screen. */
import { randomUUID } from "node:crypto";
import { parseAuditResults } from "./audit";
import type { AuditResults, AuditStatus } from "./audit";
import {
  AUDIT_ACTIVE_PROJECT_KEY,
  AUDIT_PROJECTS_KEY,
  DEFAULT_PROJECT,
  parseAuditProjects,
  projectStorageKey,
  safeActiveProjectId,
} from "./audit-projects";
import type { AuditProject } from "./audit-projects";
import type { WcagVersion } from "./types";

export interface AuditStorage {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export type AuditSnapshot = {
  projects: AuditProject[];
  activeProject: AuditProject;
  audits: Record<WcagVersion, AuditResults>;
  ready: boolean;
  busy: boolean;
};

// Only IDs are journaled; existing project/result keys retain their original format.
const DELETION_CLEANUP_KEY = "wcag-audit-deletion-cleanup-v1";

export class AuditStore {
  private state: AuditSnapshot = {
    projects: [DEFAULT_PROJECT],
    activeProject: DEFAULT_PROJECT,
    audits: { "2.1": {}, "2.2": {} },
    ready: false,
    busy: false,
  };
  private listeners = new Set<() => void>();
  private pending: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: AuditStorage,
    private valid: Record<WcagVersion, ReadonlySet<string>>,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(update: Partial<AuditSnapshot>) {
    this.state = { ...this.state, ...update };
    this.listeners.forEach((listener) => listener());
  }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.pending.catch(() => undefined).then(operation);
    this.pending = task;
    return task;
  }
  private requireReady() {
    if (!this.state.ready || this.state.busy)
      throw new Error(
        "Wait for the selected audit to load successfully. Reopen the command to retry a failed load.",
      );
  }
  private async read(project: AuditProject) {
    const versions: WcagVersion[] = ["2.1", "2.2"];
    const raw = await Promise.all(
      versions.map((version) =>
        this.storage.getItem(projectStorageKey(project.id, version)),
      ),
    );
    // A corrupt snapshot must not be mistaken for an empty audit and overwritten.
    for (const item of raw) {
      if (item !== undefined && item !== null) {
        if (typeof item !== "string")
          throw new Error("Invalid saved audit data");
        const parsed: unknown = JSON.parse(item);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
          throw new Error("Invalid saved audit data");
      }
    }
    return {
      "2.1": parseAuditResults(raw[0], this.valid["2.1"]),
      "2.2": parseAuditResults(raw[1], this.valid["2.2"]),
    };
  }
  private async cleanupDeletedProjects(projects: AuditProject[]) {
    const raw = await this.storage.getItem(DELETION_CLEANUP_KEY);
    if (raw === undefined || raw === null) return;
    if (typeof raw !== "string")
      throw new Error("Invalid pending audit cleanup");
    const pending: unknown = JSON.parse(raw);
    if (
      !Array.isArray(pending) ||
      !pending.every((id) => typeof id === "string")
    )
      throw new Error("Invalid pending audit cleanup");
    for (const id of pending as string[]) {
      // If unlinking failed, the audit is still selectable and must be preserved.
      if (projects.some((project) => project.id === id)) continue;
      await this.storage.removeItem(projectStorageKey(id, "2.1"));
      await this.storage.removeItem(projectStorageKey(id, "2.2"));
    }
    await this.storage.removeItem(DELETION_CLEANUP_KEY);
  }
  initialize = () =>
    this.enqueue(async () => {
      this.publish({ busy: true, ready: false });
      try {
        const [raw, id] = await Promise.all([
          this.storage.getItem(AUDIT_PROJECTS_KEY),
          this.storage.getItem(AUDIT_ACTIVE_PROJECT_KEY),
        ]);
        if (
          raw !== undefined &&
          raw !== null &&
          (typeof raw !== "string" || !Array.isArray(JSON.parse(raw)))
        )
          throw new Error("Invalid saved audit list");
        const projects = parseAuditProjects(raw);
        const activeProject =
          projects.find((p) => p.id === safeActiveProjectId(id, projects)) ??
          DEFAULT_PROJECT;
        const audits = await this.read(activeProject);
        this.publish({ projects, activeProject, audits, ready: true });
        await this.cleanupDeletedProjects(projects);
      } finally {
        this.publish({ busy: false });
      }
    });
  switchProject = (id: string) => {
    if (!this.state.ready)
      return Promise.reject(new Error("Audits have not loaded successfully"));
    // Immediately block new result actions; accepted operations finish in order.
    this.publish({ busy: true });
    return this.enqueue(async () => {
      try {
        const project = this.state.projects.find((p) => p.id === id);
        if (!project) throw new Error("Audit no longer exists");
        const audits = await this.read(project);
        await this.storage.setItem(AUDIT_ACTIVE_PROJECT_KEY, project.id);
        this.publish({ activeProject: project, audits });
      } finally {
        this.publish({ busy: false });
      }
    });
  };
  save = (
    projectId: string,
    version: WcagVersion,
    number: string,
    status: AuditStatus,
    notes: string,
  ) => {
    this.requireReady();
    return this.enqueue(async () => {
      if (this.state.activeProject.id !== projectId)
        throw new Error(
          "The selected audit changed. Reopen the result editor.",
        );
      if (!this.valid[version].has(number))
        throw new Error("Criterion is not part of this WCAG version");
      const results = {
        ...this.state.audits[version],
        [number]: { status, notes, updatedAt: new Date().toISOString() },
      };
      await this.storage.setItem(
        projectStorageKey(projectId, version),
        JSON.stringify(results),
      );
      this.publish({ audits: { ...this.state.audits, [version]: results } });
    });
  };
  clear = (projectId: string, version: WcagVersion) => {
    this.requireReady();
    return this.enqueue(async () => {
      if (this.state.activeProject.id !== projectId)
        throw new Error("The selected audit changed");
      await this.storage.removeItem(projectStorageKey(projectId, version));
      this.publish({ audits: { ...this.state.audits, [version]: {} } });
    });
  };
  create = (name: string) => {
    this.requireReady();
    return this.enqueue(async () => {
      if (!name.trim() || name.length > 90 || this.state.projects.length >= 100)
        throw new Error("Use a name of 1–90 characters and at most 100 audits");
      const project = {
        id: randomUUID(),
        name: name.trim(),
        createdAt: new Date().toISOString(),
      };
      const projects = [...this.state.projects, project];
      await this.storage.setItem(AUDIT_PROJECTS_KEY, JSON.stringify(projects));
      this.publish({ projects });
      // Creating and selecting are separate durable operations. A failed selection
      // keeps the created project in the list and the previous audit active.
      await this.storage.setItem(AUDIT_ACTIVE_PROJECT_KEY, project.id);
      this.publish({
        activeProject: project,
        audits: { "2.1": {}, "2.2": {} },
      });
    });
  };
  delete = (id: string) => {
    this.requireReady();
    this.publish({ busy: true });
    return this.enqueue(async () => {
      try {
        if (id === "default")
          throw new Error("The original audit cannot be deleted");
        if (!this.state.projects.some((p) => p.id === id))
          throw new Error("Audit no longer exists");
        if (this.state.activeProject.id === id) {
          const audits = await this.read(DEFAULT_PROJECT);
          await this.storage.setItem(AUDIT_ACTIVE_PROJECT_KEY, "default");
          this.publish({ activeProject: DEFAULT_PROJECT, audits });
        }
        // Unlink before cleanup: a failed metadata write cannot partially erase
        // an audit that is still selectable. Retryable cleanup leaves no stale UI.
        await this.cleanupDeletedProjects(this.state.projects);
        await this.storage.setItem(DELETION_CLEANUP_KEY, JSON.stringify([id]));
        const projects = this.state.projects.filter((p) => p.id !== id);
        await this.storage.setItem(
          AUDIT_PROJECTS_KEY,
          JSON.stringify(projects),
        );
        this.publish({ projects });
        try {
          await this.cleanupDeletedProjects(projects);
        } catch {
          throw new Error(
            "Audit removed from the list, but local result cleanup failed. Reopen the command to retry cleanup.",
          );
        }
      } finally {
        this.publish({ busy: false });
      }
    });
  };
}
