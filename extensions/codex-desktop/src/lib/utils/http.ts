function authHeaders(authorization?: string) {
  return authorization ? { Authorization: authorization } : undefined;
}

async function fetchText(url: string | URL, authorization?: string) {
  const response = await fetch(url, {
    headers: authHeaders(authorization),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return text;
}

export async function requestJson<T>(
  url: string | URL,
  authorization?: string,
): Promise<T> {
  const text = await fetchText(url, authorization);
  if (!text) {
    throw new Error("Expected JSON response but received an empty body");
  }
  return JSON.parse(text) as T;
}

export async function waitForHealth(
  baseUrl: string,
  authorization?: string,
  timeoutMs = 10000,
  errorContext?: () => string,
) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      await fetchText(new URL("/health", baseUrl), authorization);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  const details = [lastError, errorContext?.()].filter(Boolean).join("\n");
  throw new Error(
    details
      ? `Codex server did not become healthy\n${details}`
      : "Codex server did not become healthy",
  );
}
