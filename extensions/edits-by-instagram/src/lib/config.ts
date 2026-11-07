export class ConnectionError extends Error {
  constructor(
    public readonly title: string,
    message: string,
  ) {
    super(message);
  }
}

export interface ConnectionConfig {
  endpoint: URL;
  token: string;
}

export function parseConnectionConfig(preferences: Preferences): ConnectionConfig {
  if (!preferences.endpoint?.trim()) {
    throw new ConnectionError("Endpoint missing", "Copy the local endpoint from Edits into extension preferences.");
  }
  let endpoint: URL;
  try {
    endpoint = new URL(preferences.endpoint.trim());
  } catch {
    throw new ConnectionError("Invalid endpoint", "Enter the complete local URL provided by Edits.");
  }
  if (
    !["http:", "https:"].includes(endpoint.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash
  ) {
    throw new ConnectionError(
      "Unsupported endpoint",
      "Use a loopback HTTP or HTTPS URL (localhost, 127.0.0.1, or [::1]) without a username, password, or fragment. Remote servers are not supported.",
    );
  }
  const token = preferences.token?.trim();
  if (!token) {
    throw new ConnectionError("Credentials missing", "Save the local automation token in the secure Token preference.");
  }
  if (token && /[\r\n]/.test(token)) {
    throw new ConnectionError("Invalid credential", "The Token preference must contain only the token, on one line.");
  }
  return { endpoint, token };
}

export function safeConnectionError(error: unknown): ConnectionError {
  if (error instanceof ConnectionError) return error;
  // Transport errors can include response bodies, tokens, and endpoint URLs. Never display them.
  return new ConnectionError(
    "Connection failed",
    "Open Edits, check that automation is enabled, and verify the transport, endpoint, and authentication in preferences. Refresh after restarting Edits. Automation state cannot be determined from a failed connection.",
  );
}

export function redactConnectionSecrets(text: string, config: ConnectionConfig): string {
  const secrets = [config.token, config.endpoint.href, config.endpoint.pathname, config.endpoint.search];
  for (const value of config.endpoint.searchParams.values()) secrets.push(value);
  // Do not replace '/' when it is only a path separator.
  for (const secret of secrets.filter((value): value is string => Boolean(value && value !== "/"))) {
    text = text.split(secret).join("[redacted]");
  }
  return text;
}
