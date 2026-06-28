const DEFAULT_SERVER_URL = "http://localhost:8000";

export function parseServerUrl(rawUrl: string): { baseUrl: string; hasCustomPath: boolean; fullUrl: string } {
  const trimmed = rawUrl.trim() || DEFAULT_SERVER_URL;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Invalid TTS server URL");
  }

  const baseUrl = `${url.protocol}//${url.host}`;
  const hasCustomPath = url.pathname !== "/" && url.pathname !== "";
  return { baseUrl, hasCustomPath, fullUrl: url.toString() };
}

export { DEFAULT_SERVER_URL };
