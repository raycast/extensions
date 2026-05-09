import { homedir } from "os";
import { join } from "path";
import { readFile } from "fs/promises";

const DISCOVERY_PATH = join(
  homedir(),
  "Library/Application Support/macAppLibrary/api.json",
);

export type Discovery = {
  host: string;
  port: number;
  token: string;
  pid: number;
  apiVersion: string;
};

export type AppSummary = {
  bundleID: string;
  name: string;
  bundlePath: string;
  version?: string | null;
  developer?: string | null;
  description?: string | null;
  categories: string[];
  websiteURL?: string | null;
  isFavorite: boolean;
  isRunning: boolean;
  sizeBytes?: number | null;
  lastLaunched?: string | null;
  lastModified?: string | null;
  dateAdded?: string | null;
  systemCategory?: string | null;
};

export type AppDetail = AppSummary & {
  community?: {
    description?: string | null;
    categories?: string[];
    developer?: string | null;
    websiteURL?: string | null;
  } | null;
  user?: {
    description?: string | null;
    developer?: string | null;
    categories?: string[];
    notes?: string | null;
    websiteURL?: string | null;
  } | null;
};

export class MacAppLibraryNotRunningError extends Error {
  constructor() {
    super(
      "macAppLibrary is not running. Open the macAppLibrary app and try again.",
    );
    this.name = "MacAppLibraryNotRunningError";
  }
}

let cachedDiscovery: Discovery | null = null;

async function readDiscovery(): Promise<Discovery> {
  let raw: string;
  try {
    raw = await readFile(DISCOVERY_PATH, "utf8");
  } catch {
    throw new MacAppLibraryNotRunningError();
  }
  const parsed = JSON.parse(raw) as Discovery;
  // Verify the process is alive — the file lingers across crashes.
  try {
    process.kill(parsed.pid, 0);
  } catch {
    throw new MacAppLibraryNotRunningError();
  }
  return parsed;
}

async function getDiscovery(): Promise<Discovery> {
  if (cachedDiscovery) {
    try {
      process.kill(cachedDiscovery.pid, 0);
      return cachedDiscovery;
    } catch {
      cachedDiscovery = null;
    }
  }
  cachedDiscovery = await readDiscovery();
  return cachedDiscovery;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  { parse = true }: { parse?: boolean } = {},
): Promise<T> {
  const d = await getDiscovery();
  const url = `http://${d.host}:${d.port}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${d.token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    cachedDiscovery = null;
    throw new Error(
      "Unauthorized — token rejected. Try reopening macAppLibrary.",
    );
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      if (body?.message) message = body.message;
      else if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (!parse || res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type Category = { name: string; appCount: number };

export type AppUpdateRequest = {
  description?: string;
  developer?: string;
  categories?: string[];
  notes?: string;
  websiteURL?: string;
  isFavorite?: boolean;
};

export async function listApps(params?: {
  category?: string;
  developer?: string;
  running?: boolean;
}): Promise<AppSummary[]> {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.developer) search.set("developer", params.developer);
  if (params?.running !== undefined)
    search.set("running", String(params.running));
  const qs = search.toString();
  return request<AppSummary[]>(`/v1/apps${qs ? `?${qs}` : ""}`);
}

export async function getApp(bundleID: string): Promise<AppDetail> {
  return request<AppDetail>(`/v1/apps/${encodeURIComponent(bundleID)}`);
}

export async function updateApp(
  bundleID: string,
  body: AppUpdateRequest,
): Promise<AppDetail> {
  return request<AppDetail>(`/v1/apps/${encodeURIComponent(bundleID)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function listCategories(): Promise<Category[]> {
  return request<Category[]>("/v1/categories");
}

export async function quitApp(bundleID: string): Promise<void> {
  await request<void>(
    `/v1/apps/${encodeURIComponent(bundleID)}/quit`,
    { method: "POST" },
    { parse: false },
  );
}

export async function pullCommunity(bundleID: string): Promise<AppDetail> {
  return request<AppDetail>(
    `/v1/apps/${encodeURIComponent(bundleID)}/community/pull`,
    { method: "POST" },
  );
}

export async function submitCommunity(
  bundleID: string,
): Promise<{ prURL: string; prNumber: number }> {
  return request<{ prURL: string; prNumber: number }>(
    `/v1/apps/${encodeURIComponent(bundleID)}/community/submit`,
    { method: "POST" },
  );
}

export async function aiDescribe(
  bundleID: string,
): Promise<{ description: string }> {
  return request<{ description: string }>(
    `/v1/apps/${encodeURIComponent(bundleID)}/ai-describe`,
    { method: "POST" },
  );
}
