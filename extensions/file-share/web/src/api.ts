export type EntryType = "file" | "directory" | "text";

export type Entry = {
  id: string;
  type: EntryType;
  name: string;
  path?: string;
  content?: string;
  source: string;
  addedAt: string;
  size?: number;
  mtimeMs?: number;
  missing?: boolean;
};

export type BrowsedItem = {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  mtimeMs: number;
};

export type Browse = {
  entry: { id: string; name: string; type: EntryType };
  dir: string;
  parent: string | null;
  entries: BrowsedItem[];
};

export type UploadInit = {
  uploadId: string;
  name: string;
  size: number;
  chunkSize: number;
  received: number[];
};

/** One item of a batch download: an entry, optionally a path inside a shared directory. */
export type ZipItem = { entry: string; path: string };

const CHUNK_SIZE = 8 * 1024 * 1024;

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string") return payload.error;
  } catch {
    // Fall through to the status text.
  }
  return `Request failed (${response.status})`;
}

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

export async function fetchEntries(): Promise<Entry[]> {
  const response = await fetch("/api/list");
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as { entries: Entry[] };
  return payload.entries ?? [];
}

export async function fetchBrowse(entry: string, dir: string): Promise<Browse> {
  const response = await fetch(`/api/browse?entry=${encodeURIComponent(entry)}&path=${encodeURIComponent(dir)}`);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Browse;
}

export async function fetchText(entryId: string, path: string): Promise<string> {
  const response = await fetch(fileUrl(entryId, path, false));
  if (!response.ok) throw new Error(await readError(response));
  return await response.text();
}

export function addText(text: string): Promise<unknown> {
  return postJson("/api/list", { type: "text", content: text });
}

export async function removeEntry(id: string): Promise<void> {
  const response = await fetch(`/api/list?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}

/** Empties the share list. Nothing on disk is deleted — this is the same as removing every entry one by one. */
export async function clearList(): Promise<void> {
  const response = await fetch("/api/list?all=1", { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}

export function fileUrl(entry: string, path: string, download: boolean): string {
  const query = `entry=${encodeURIComponent(entry)}&path=${encodeURIComponent(path)}`;
  return `/api/file?${query}${download ? "&download=1" : ""}`;
}

/**
 * Downloads go through the service: it answers with the URL to fetch, so a request that cannot be served comes
 * back as a message the page can show — instead of a navigation that dumps the API's JSON error on screen.
 * Any number of items can be handed in; one file stays a file, anything else becomes a zip.
 */
export async function download(items: ZipItem[], onError?: (message: string) => void): Promise<void> {
  if (items.length === 0) return;
  try {
    const { url } = await postJson<{ url: string }>("/api/download", { items });
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } catch (reason) {
    onError?.(reason instanceof Error ? reason.message : String(reason));
  }
}

/** Reconnects are handled by the browser; a dropped stream simply means the manual refresh is used again. */
export function subscribeToChanges(onChange: () => void): () => void {
  const source = new EventSource("/api/events");
  source.onmessage = () => onChange();
  return () => source.close();
}

function aborted(): DOMException {
  return new DOMException("The upload was cancelled", "AbortError");
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function sendChunk(uploadId: string, index: number, blob: Blob, signal?: AbortSignal): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`/api/upload/chunk?uploadId=${uploadId}&index=${index}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: blob,
        signal,
      });
      if (!response.ok) throw new Error(await readError(response));
      return;
    } catch (error) {
      // A cancelled chunk is the caller's decision, not a flaky connection — do not retry it.
      if (isAbort(error) || signal?.aborted) throw aborted();
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Chunk upload failed");
}

/**
 * Chunked upload with resume: the server keys an upload by name, size and modification time, so picking the same
 * file again only sends the chunks it is still missing.
 *
 * The caller gets the server-side upload id through `onStarted`, which is what makes `cancelUpload` possible
 * while a large file is still on its way.
 */
export async function uploadFile(
  file: File,
  onProgress: (ratio: number, status: string) => void,
  options: { signal?: AbortSignal; onStarted?: (uploadId: string) => void } = {},
): Promise<string> {
  const { signal, onStarted } = options;
  const init = await postJson<UploadInit>(
    "/api/upload/init",
    {
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      chunkSize: CHUNK_SIZE,
    },
    signal,
  );
  onStarted?.(init.uploadId);
  const received = new Set(init.received ?? []);
  const total = Math.max(Math.ceil(file.size / init.chunkSize), 1);
  const alreadyThere = received.size;

  for (let index = 0; index < total; index += 1) {
    if (signal?.aborted) throw aborted();
    if (!received.has(index)) {
      const blob = file.slice(index * init.chunkSize, Math.min((index + 1) * init.chunkSize, file.size));
      await sendChunk(init.uploadId, index, blob, signal);
    }
    const done = index + 1;
    const label = alreadyThere > 0 && index < alreadyThere ? "Resuming" : "Uploading";
    onProgress(done / total, `${label}… ${Math.round((done / total) * 100)}%`);
  }

  const query = new URLSearchParams({
    uploadId: init.uploadId,
    name: file.name,
    size: String(file.size),
    lastModified: String(file.lastModified),
  });
  const response = await fetch(`/api/upload/complete?${query.toString()}`, { method: "POST", signal });
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as { entry?: { name?: string } };
  return payload.entry?.name ?? file.name;
}

/** Cancelling drops the chunks the server had already stored, so nothing half-finished is left behind. */
export async function cancelUpload(uploadId: string): Promise<void> {
  const response = await fetch(`/api/upload?uploadId=${encodeURIComponent(uploadId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}
