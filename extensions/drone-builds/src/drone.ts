import { getPreferenceValues } from "@raycast/api";
import {
  redactFeed,
  redactUser,
  syntheticBuild,
  syntheticBuildDetail,
  syntheticCrons,
  syntheticLogs,
  syntheticRepos,
} from "./redact";

export interface DroneUser {
  id: number;
  login: string;
  email: string;
  avatar_url?: string;
  admin?: boolean;
}

export type BuildStatus =
  | "success"
  | "failure"
  | "error"
  | "killed"
  | "declined"
  | "skipped"
  | "running"
  | "pending"
  | "waiting_on_dependencies"
  | "blocked";

export interface DroneBuild {
  id: number;
  number: number;
  status: BuildStatus;
  event: string;
  sender: string;
  author_login: string;
  author_name: string;
  author_email: string;
  started: number;
  finished: number;
  message: string;
  ref: string;
  source: string;
  target: string;
  link: string;
}

export interface DroneFeed {
  id: number;
  namespace: string;
  name: string;
  slug: string;
  build?: DroneBuild;
}

function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

function baseUrl(): string {
  return prefs().droneUrl.trim().replace(/\/+$/, "");
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${prefs().droneToken}`,
    Accept: "application/json",
  };
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${baseUrl()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...authHeaders(),
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
  } catch (e) {
    throw new Error(`Network error calling ${path}: ${(e as Error).message}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Drone ${res.status} ${res.statusText} on ${path}${body ? ` — ${body.slice(0, 200)}` : ""}`,
    );
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export interface DroneRepo {
  id: number;
  uid?: string;
  user_id?: number;
  namespace: string;
  name: string;
  slug: string;
  scm?: string;
  link?: string;
  default_branch?: string;
  active?: boolean;
  private?: boolean;
  visibility?: string;
}

export interface DroneCron {
  id: number;
  repo_id: number;
  name: string;
  expr: string;
  /** Unix seconds — next scheduled run */
  next?: number;
  /** Unix seconds — last run */
  prev?: number;
  event?: string;
  branch?: string;
  target?: string;
  disabled?: boolean;
  created?: number;
  updated?: number;
}

export interface DroneStep {
  id: number;
  step_id?: number;
  number: number;
  name: string;
  status: BuildStatus;
  exit_code?: number;
  started: number;
  stopped: number;
  error?: string;
}

export interface DroneStage {
  id: number;
  build_id: number;
  number: number;
  name: string;
  kind?: string;
  type?: string;
  status: BuildStatus;
  errignore?: boolean;
  exit_code?: number;
  started: number;
  stopped: number;
  os?: string;
  arch?: string;
  steps?: DroneStep[];
}

export type DroneBuildDetail = DroneBuild & { stages?: DroneStage[] };

export interface DroneLogLine {
  pos: number;
  /** Unix seconds. */
  time?: number;
  out: string;
}

function isDemoMode(): boolean {
  try {
    return !!prefs().demoMode;
  } catch {
    return false;
  }
}

export const getMe = async (): Promise<DroneUser> => {
  const real = await req<DroneUser>("/api/user");
  return isDemoMode() ? redactUser(real) : real;
};

export const listMyBuilds = async (page = 1): Promise<DroneFeed[]> => {
  const real = await req<DroneFeed[]>(`/api/user/builds?page=${page}`);
  return isDemoMode() ? redactFeed(real) : real;
};

export const restartBuild = async (
  slug: string,
  num: number,
): Promise<DroneBuild> => {
  if (isDemoMode()) return syntheticBuild(slug, `restart-${num}`);
  return req<DroneBuild>(`/api/repos/${slug}/builds/${num}`, {
    method: "POST",
  });
};

export const cancelBuild = async (slug: string, num: number): Promise<void> => {
  if (isDemoMode()) return;
  return req<void>(`/api/repos/${slug}/builds/${num}`, { method: "DELETE" });
};

/** All repos the bearer token has access to. Paged 25 per page on most Drone servers. */
export const listRepos = async (page = 1): Promise<DroneRepo[]> => {
  if (isDemoMode()) return page > 1 ? [] : syntheticRepos;
  return req<DroneRepo[]>(`/api/user/repos?page=${page}`);
};

export const listCrons = async (slug: string): Promise<DroneCron[]> => {
  if (isDemoMode()) return syntheticCrons(slug);
  return req<DroneCron[]>(`/api/repos/${slug}/cron`);
};

/** POST /api/repos/{slug}/cron/{name} — trigger the cron now. Returns the new build. */
export const runCron = async (
  slug: string,
  name: string,
): Promise<DroneBuild> => {
  if (isDemoMode()) return syntheticBuild(slug, name);
  return req<DroneBuild>(
    `/api/repos/${slug}/cron/${encodeURIComponent(name)}`,
    {
      method: "POST",
    },
  );
};

/** Single build with embedded stages and steps. */
export const getBuild = async (
  slug: string,
  num: number,
): Promise<DroneBuildDetail> => {
  if (isDemoMode()) return syntheticBuildDetail(slug, num);
  return req<DroneBuildDetail>(`/api/repos/${slug}/builds/${num}`);
};

/** Log lines for one step of one stage of one build. */
export const getStepLogs = async (
  slug: string,
  build: number,
  stage: number,
  step: number,
): Promise<DroneLogLine[]> => {
  if (isDemoMode()) return syntheticLogs();
  return req<DroneLogLine[]>(
    `/api/repos/${slug}/builds/${build}/logs/${stage}/${step}`,
  );
};
