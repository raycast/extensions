import { authorize } from "./oauth";
import { delay } from "./system";

/**
 * Thin wrapper over the Google Drive v3 REST API using fetch. Scope is drive.file,
 * so every query is implicitly limited to files this extension created.
 */

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  parents?: string[];
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await authorize();
  return { Authorization: `Bearer ${token}` };
}

/** Drive request with retry + exponential backoff on 429/5xx. */
async function driveFetch(
  url: string,
  init: RequestInit,
  attempt = 0,
): Promise<Response> {
  const headers = { ...(await authHeader()), ...(init.headers ?? {}) };
  const response = await fetch(url, { ...init, headers });

  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    await delay(2 ** attempt * 500);
    return driveFetch(url, init, attempt + 1);
  }
  if (!response.ok) {
    const detail = await safeError(response);
    throw new Error(`Google Drive error ${response.status}: ${detail}`);
  }
  return response;
}

function escapeQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Find a non-trashed child folder by name, or null. */
async function findFolder(
  name: string,
  parentId: string | null,
): Promise<string | null> {
  const clauses = [
    `name = '${escapeQuery(name)}'`,
    `mimeType = '${FOLDER_MIME}'`,
    "trashed = false",
    parentId ? `'${parentId}' in parents` : "'root' in parents",
  ];
  const params = new URLSearchParams({
    q: clauses.join(" and "),
    fields: "files(id,name)",
    spaces: "drive",
  });
  const response = await driveFetch(`${DRIVE_API}/files?${params}`, {
    method: "GET",
  });
  const data = (await response.json()) as { files: DriveFile[] };
  return data.files[0]?.id ?? null;
}

async function createFolder(
  name: string,
  parentId: string | null,
): Promise<string> {
  const metadata = {
    name,
    mimeType: FOLDER_MIME,
    parents: parentId ? [parentId] : undefined,
  };
  const response = await driveFetch(`${DRIVE_API}/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  const data = (await response.json()) as { id: string };
  return data.id;
}

async function ensureFolder(
  name: string,
  parentId: string | null,
): Promise<string> {
  return (
    (await findFolder(name, parentId)) ?? (await createFolder(name, parentId))
  );
}

/** Ensure /Raycast-Backups/<deviceName> exists; return its folder ID. */
export async function ensureDeviceFolder(deviceName: string): Promise<string> {
  const root = await ensureFolder("Raycast-Backups", null);
  return ensureFolder(deviceName, root);
}

/** Multipart upload of a binary or text file into a folder; returns the new file ID. */
export async function uploadFile(
  folderId: string,
  name: string,
  content: Buffer | string,
  mimeType: string,
): Promise<string> {
  const boundary = "raycast-backup-boundary-7MA4YWxkTrZu0gW";
  const metadata = JSON.stringify({ name, parents: [folderId] });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    ),
    Buffer.from(metadata),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    Buffer.isBuffer(content) ? content : Buffer.from(content, "utf-8"),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const response = await driveFetch(
    `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  const data = (await response.json()) as { id: string };
  return data.id;
}

/** List non-trashed files directly inside a folder, newest first. */
export async function listFiles(folderId: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,size,createdTime)",
      spaces: "drive",
      orderBy: "createdTime desc",
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await driveFetch(`${DRIVE_API}/files?${params}`, {
      method: "GET",
    });
    const data = (await response.json()) as {
      nextPageToken?: string;
      files: DriveFile[];
    };
    files.push(...data.files);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return files;
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const response = await driveFetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    method: "GET",
  });
  return Buffer.from(await response.arrayBuffer());
}

export async function downloadText(fileId: string): Promise<string> {
  return (await downloadFile(fileId)).toString("utf-8");
}

export async function deleteFile(fileId: string): Promise<void> {
  await driveFetch(`${DRIVE_API}/files/${fileId}`, { method: "DELETE" });
}

async function safeError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: { message?: string } };
    return data.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
