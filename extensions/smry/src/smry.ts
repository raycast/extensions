export const MAX_HTML_BYTES = 4 * 1024 * 1024;
const OVERSIZED_CAPTURE_ERROR = "EXTENSION_CAPTURE_TOO_LARGE";

export type SaveDestination = "inbox" | "later";

export type CapturedPageResult =
  { ok: true; html: string; bytes: number } | { ok: false; detail: string; errorType?: string };

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
    const [first, second, third] = ipv4;
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 0 && (third === 0 || third === 2)) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100))) ||
      (first === 203 && second === 0 && third === 113) ||
      first >= 224
    );
  }

  if (hostname.includes(":")) {
    const firstSegment = hostname.split(":", 1)[0];
    const firstHextet = Number.parseInt(firstSegment || "0", 16);
    const isUniqueLocal = firstHextet >= 0xfc00 && firstHextet <= 0xfdff;
    const isLinkLocal = firstHextet >= 0xfe80 && firstHextet <= 0xfebf;
    const isSiteLocal = firstHextet >= 0xfec0 && firstHextet <= 0xfeff;
    const isMulticast = firstHextet >= 0xff00 && firstHextet <= 0xffff;
    const isDocumentation = hostname.startsWith("2001:db8:");
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
      isUniqueLocal ||
      isLinkLocal ||
      isSiteLocal ||
      isMulticast ||
      isDocumentation ||
      (embeddedIpv4 ? isPrivateOrLocalHostname(embeddedIpv4) : false)
    );
  }

  return false;
}

export function isSupportedArticleUrl(rawUrl: string | undefined): rawUrl is string {
  if (!rawUrl || rawUrl.length > 4096) return false;

  try {
    const url = new URL(rawUrl);
    const hostname = normalizeHostname(url.hostname);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      !isPrivateOrLocalHostname(hostname) &&
      hostname !== "smry.ai" &&
      hostname !== "www.smry.ai"
    );
  } catch {
    return false;
  }
}

export function normalizeArticleUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!isSupportedArticleUrl(candidate)) return null;
  return new URL(candidate).toString();
}

export function getHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

export async function captureRenderedPage(params: {
  tabId: number;
  getContent: (options: { tabId: number; format: "html" }) => Promise<string>;
}): Promise<CapturedPageResult> {
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
      errorType: OVERSIZED_CAPTURE_ERROR,
    };
  }
  return { ok: true, html, bytes };
}
