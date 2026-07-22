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

function normalizeHostname(rawHostname: string): string {
  return rawHostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/g, "");
}

function isPrivateOrLocalHostname(rawHostname: string): boolean {
  const hostname = normalizeHostname(rawHostname);
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "::" ||
    hostname === "::1"
  ) {
    return true;
  }

  const ipv4 = hostname
    .match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    ?.slice(1)
    .map(Number);
  if (ipv4?.length === 4 && ipv4.every((octet) => octet >= 0 && octet <= 255)) {
    const [first, second] = ipv4;
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  if (hostname.includes(":")) {
    const firstSegment = hostname.split(":", 1)[0];
    const firstHextet = Number.parseInt(firstSegment || "0", 16);
    const isUniqueLocal = firstHextet >= 0xfc00 && firstHextet <= 0xfdff;
    const isLinkLocal = firstHextet >= 0xfe80 && firstHextet <= 0xfebf;
    const isSiteLocal = firstHextet >= 0xfec0 && firstHextet <= 0xfeff;
    const embeddedIpv4Dotted = hostname.match(/^::(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
    const embeddedIpv4Hex = hostname.match(/^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    const embeddedIpv4 = embeddedIpv4Hex
      ? [
          Number.parseInt(embeddedIpv4Hex[1], 16) >> 8,
          Number.parseInt(embeddedIpv4Hex[1], 16) & 0xff,
          Number.parseInt(embeddedIpv4Hex[2], 16) >> 8,
          Number.parseInt(embeddedIpv4Hex[2], 16) & 0xff,
        ].join(".")
      : embeddedIpv4Dotted;
    return (
      isUniqueLocal || isLinkLocal || isSiteLocal || (embeddedIpv4 ? isPrivateOrLocalHostname(embeddedIpv4) : false)
    );
  }

  return false;
}

export function isSupportedArticleUrl(rawUrl: string | undefined): rawUrl is string {
  if (!rawUrl) return false;

  try {
    const url = new URL(rawUrl);
    const hostname = normalizeHostname(url.hostname);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !isPrivateOrLocalHostname(hostname) &&
      hostname !== "smry.ai" &&
      hostname !== "www.smry.ai"
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
  // Keep the full article URL inside the canonical reader parameter so its
  // query and fragment delimiters cannot escape into the outer smry URL.
  const readerUrl = new URL("/proxy", SMRY_APP_ORIGIN);
  readerUrl.searchParams.set("url", articleUrl);
  return readerUrl.toString();
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
