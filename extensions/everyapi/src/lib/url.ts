const DEFAULT_GATEWAY_ORIGIN = "https://api.everyapi.ai";

export function gatewayOrigin(configured?: string): string {
  const raw = configured?.trim() || DEFAULT_GATEWAY_ORIGIN;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Gateway URL must be an absolute HTTP or HTTPS URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Gateway URL must use HTTP or HTTPS");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(
      "Gateway URL must not contain credentials, query, or fragment",
    );
  }

  const path = parsed.pathname.replace(/\/+$/, "");
  if (path && path !== "/v1") {
    throw new Error("Gateway URL may only include the optional /v1 suffix");
  }

  return parsed.origin;
}

export function relayBase(configured?: string): string {
  return `${gatewayOrigin(configured)}/v1`;
}

export function apiBase(configured?: string): string {
  return `${gatewayOrigin(configured)}/api`;
}
