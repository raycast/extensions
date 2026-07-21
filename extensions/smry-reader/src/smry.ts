const SMRY_APP_ORIGIN = "https://smry.ai";
export const SNAPSHOT_ENDPOINT = "https://api.smry.ai/api/article/snapshot";
export const MAX_HTML_BYTES = 4 * 1024 * 1024;
export const UPLOAD_TIMEOUT_MS = 10_000;
const OVERSIZED_INGEST_ERROR = "EXTENSION_INGEST_TOO_LARGE";

export type OpenMode = "open" | "save";

export type SnapshotResult = { ok: true; token: string } | { ok: false; detail: string; errorType?: string };

type SnapshotApiError = {
  error?: unknown;
  type?: unknown;
};

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

export function isSupportedArticleUrl(rawUrl: string | undefined): rawUrl is string {
  if (!rawUrl) return false;

  try {
    const url = new URL(rawUrl);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !isLoopbackHostname(url.hostname) &&
      url.hostname !== "smry.ai" &&
      url.hostname !== "www.smry.ai"
    );
  } catch {
    return false;
  }
}

export function getHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

export function getReaderUrl(articleUrl: string): string {
  return `${SMRY_APP_ORIGIN}/${articleUrl}`;
}

export function buildReaderUrl(articleUrl: string, mode: OpenMode, snapshot: SnapshotResult): string {
  const base = getReaderUrl(articleUrl);
  if (snapshot.ok) {
    const hash = new URLSearchParams({ smryIngest: snapshot.token });
    if (mode === "save") hash.set("smryIntent", "save");
    return `${base}#${hash.toString()}`;
  }

  if (mode === "open") return base;

  const hash = new URLSearchParams({ smryIntent: "save" });
  if (snapshot.errorType === OVERSIZED_INGEST_ERROR) {
    hash.set("smryIngestError", "too_large");
  }
  return `${base}#${hash.toString()}`;
}

export async function captureAndUpload(params: {
  tabId: number;
  articleUrl: string;
  title: string;
  getContent: (options: { tabId: number; format: "html" }) => Promise<string>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<SnapshotResult> {
  let html: string;
  try {
    html = await params.getContent({ tabId: params.tabId, format: "html" });
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "The page could not be captured.",
    };
  }

  const bytes = new TextEncoder().encode(html).byteLength;
  if (bytes > MAX_HTML_BYTES) {
    return {
      ok: false,
      detail: `The page is ${bytes} bytes; the maximum is ${MAX_HTML_BYTES} bytes.`,
      errorType: OVERSIZED_INGEST_ERROR,
    };
  }

  const timeoutMs = params.timeoutMs ?? UPLOAD_TIMEOUT_MS;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await (params.fetchImpl ?? fetch)(SNAPSHOT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: params.articleUrl, html, title: params.title }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as SnapshotApiError | null;
      const error = typeof payload?.error === "string" ? payload.error.slice(0, 200) : "Snapshot upload failed.";
      return {
        ok: false,
        detail: `HTTP ${response.status}: ${error}`,
        errorType: typeof payload?.type === "string" ? payload.type : undefined,
      };
    }

    const payload = (await response.json().catch(() => null)) as { token?: unknown } | null;
    if (typeof payload?.token !== "string" || !payload.token) {
      return { ok: false, detail: "Snapshot response did not include an ingest token." };
    }

    return { ok: true, token: payload.token };
  } catch (error) {
    return {
      ok: false,
      detail: abortController.signal.aborted
        ? `Snapshot upload timed out after ${timeoutMs / 1000} seconds.`
        : error instanceof Error
          ? error.message
          : "Snapshot upload failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
