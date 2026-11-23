// fpy.sh's public API (https://fpy.sh/openapi.json). Only endpoints that exist there.
import { accessToken, forgetToken } from "./auth";
import { BASE_URL } from "./config";

export type LinkSummary = {
  id: string;
  name: string;
  url: string;
  slug: string;
  kind: "video" | "zip" | "image" | "pdf" | "audio" | "doc";
  size: number;
  status: "uploading" | "ready" | "expired" | "revoked";
  created_at: string;
  expires_at: string | null;
  shares: number;
  views: number;
  team: { id: string; name: string } | null;
};

export type Reader = {
  share_id: string | null;
  label: string;
  visits: number;
  pages_reached: number;
  pages_total: number | null;
  active_ms: number;
  completion: number;
  last_seen: string;
  device: string | null;
  city: string | null;
  country: string | null;
};

export type LinkAnalytics = { link_id: string; views: number; people: Reader[]; next: string };

export type DiskSpace = { id: string; name: string; team_id: string | null };
export type DiskFolder = { id: string; space_id: string; name: string; parent_id: string | null };
export type DiskFile = { id: string; path: string; size: number; content_type: string | null; updated_at: string };
export type DiskLink = {
  id: string;
  slug: string;
  url: string;
  space_id: string;
  folder_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  files: DiskFile[];
};
export type DiskListing = { spaces: DiskSpace[]; folders: DiskFolder[]; links: DiskLink[] };

export type DropResult = { link: LinkSummary; share_url: string; next: string };
export type UploadPlan = { link: LinkSummary; uploads: { fileId: string; partSize: number; parts: number }[] };
export type ShareCreated = { id: string; url: string; label: string };
export type Expiry = "1D" | "2D" | "3D" | "5D" | "1W" | "2W" | "1M" | "3M" | "NEVER";

export class FloppyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type ErrorBody = { error?: { message?: string; next?: string } | string; message?: string };

/** A call to fpy.sh with the user's token. Throws FloppyError with fpy.sh's own message. */
export async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "user-agent": "Floppy-Raycast", ...init.headers },
  });
  if (res.ok) return res;
  const body = (await res.json().catch(() => ({}))) as ErrorBody;
  const message =
    typeof body.error === "string"
      ? body.error
      : body.error?.message || body.message || `fpy.sh answered ${res.status}`;
  if (res.status === 401) {
    await forgetToken();
    throw new FloppyError(`${message} Run the command again to sign in.`, 401);
  }
  throw new FloppyError(message, res.status);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await request(path, init);
  return (await res.json()) as T;
}

export const json = (body: unknown): RequestInit => ({
  body: JSON.stringify(body),
  headers: { "content-type": "application/json" },
});

export const listLinks = (limit = 50, q?: string) =>
  api<{ links: LinkSummary[] }>(`/api/v1/links?limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`).then(
    (r) => r.links,
  );

export const getAnalytics = (linkId: string) => api<LinkAnalytics>(`/api/v1/links/${linkId}/analytics`);

export const getDisk = () => api<DiskListing>("/api/v1/disk");

export const createShare = (linkId: string, label: string) =>
  api<ShareCreated>(`/api/v1/links/${linkId}/shares`, { method: "POST", ...json({ label }) });

/** A disk file's text, at most `maxBytes` of it. */
export async function readDiskFile(fileId: string, maxBytes: number): Promise<string> {
  const res = await request(`/api/v1/disk/files/${fileId}`, { headers: { range: `bytes=0-${maxBytes - 1}` } });
  return new TextDecoder().decode(await res.arrayBuffer());
}
