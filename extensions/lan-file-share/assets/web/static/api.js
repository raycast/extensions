const CHUNK_SIZE = 8 * 1024 * 1024;

async function readError(response) {
  try {
    const payload = await response.json();
    if (typeof payload.error === "string") return payload.error;
  } catch {
    // Fall through to the status text.
  }
  return `Request failed (${response.status})`;
}

async function postJson(url, body, signal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new Error(await readError(response));
  return await response.json();
}

export async function fetchEntries() {
  const response = await fetch("/api/list");
  if (!response.ok) throw new Error(await readError(response));
  const payload = await response.json();
  return payload.entries ?? [];
}

export async function fetchBrowse(entry, dir) {
  const response = await fetch(
    `/api/browse?entry=${encodeURIComponent(entry)}&path=${encodeURIComponent(dir)}`,
  );
  if (!response.ok) throw new Error(await readError(response));
  return await response.json();
}

export async function fetchText(entryId, path) {
  const response = await fetch(fileUrl(entryId, path, false));
  if (!response.ok) throw new Error(await readError(response));
  return await response.text();
}

export function addText(text) {
  return postJson("/api/list", { type: "text", content: text });
}

export async function removeEntry(id) {
  const response = await fetch(`/api/list?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}

/** Empties the share list. Nothing on disk is deleted — this is the same as removing every entry one by one. */
export async function clearList() {
  const response = await fetch("/api/list?all=1", { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}

export function fileUrl(entry, path, download) {
  const query = `entry=${encodeURIComponent(entry)}&path=${encodeURIComponent(path)}`;
  return `/api/file?${query}${download ? "&download=1" : ""}`;
}

/**
 * Downloads go through the service: it answers with the URL to fetch, so a request that cannot be served comes
 * back as a message the page can show — instead of a navigation that dumps the API's JSON error on screen.
 */
export async function download(items, onError) {
  if (items.length === 0) return;
  try {
    const { url } = await postJson("/api/download", { items });
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
export function subscribeToChanges(onChange) {
  const source = new EventSource("/api/events");
  source.onmessage = () => onChange();
  return () => source.close();
}

function aborted() {
  return new DOMException("The upload was cancelled", "AbortError");
}

function isAbort(error) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function sendChunk(uploadId, index, blob, signal) {
  let lastError;
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
 */
export async function uploadFile(file, onProgress, options = {}) {
  const { signal, onStarted } = options;
  const init = await postJson(
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
      const blob = file.slice(
        index * init.chunkSize,
        Math.min((index + 1) * init.chunkSize, file.size),
      );
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
  const response = await fetch(`/api/upload/complete?${query.toString()}`, {
    method: "POST",
    signal,
  });
  if (!response.ok) throw new Error(await readError(response));
  const payload = await response.json();
  return payload.entry?.name ?? file.name;
}

/** Cancelling drops the chunks the server had already stored, so nothing half-finished is left behind. */
export async function cancelUpload(uploadId) {
  const response = await fetch(`/api/upload?uploadId=${encodeURIComponent(uploadId)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await readError(response));
}
