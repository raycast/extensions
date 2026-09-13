export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("Base URL is required.");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid HTTP or HTTPS URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Base URL must use HTTP or HTTPS.");
  }
  if (parsed.protocol === "http:" && !isLoopbackHostname(parsed.hostname)) {
    throw new Error(
      "HTTP is only allowed for loopback providers. Use HTTPS for remote providers.",
    );
  }
  if (parsed.search || parsed.hash) {
    throw new Error("Base URL cannot contain a query string or fragment.");
  }

  const suffix = "/chat/completions";
  if (parsed.pathname.endsWith(suffix)) {
    parsed.pathname = parsed.pathname.slice(0, -suffix.length) || "/";
  }

  return parsed.toString().replace(/\/+$/, "");
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const ipv4Parts = normalized.split(".");
  const isIpv4Loopback =
    ipv4Parts.length === 4 &&
    ipv4Parts[0] === "127" &&
    ipv4Parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "::1" ||
    isIpv4Loopback
  );
}

export function chatCompletionsUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/chat/completions`;
}

export function modelsUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/models`;
}
