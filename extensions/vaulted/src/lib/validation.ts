import { ValidationError } from "./errors";

export const MAX_SECRET_LENGTH = 1000;

export interface ParsedVaultedUrl {
  origin: string;
  id: string;
  fragment: string;
}

export function parseVaultedUrl(url: string): ParsedVaultedUrl {
  const trimmed = url.trim();
  const hashIndex = trimmed.indexOf("#");
  if (hashIndex === -1) {
    throw new ValidationError("Missing #key fragment in URL.", "INVALID_URL");
  }

  const fragment = trimmed.slice(hashIndex + 1);
  if (!fragment) {
    throw new ValidationError("Empty #key fragment in URL.", "INVALID_URL");
  }

  const urlWithoutFragment = trimmed.slice(0, hashIndex);
  const match = urlWithoutFragment.match(/^(https?:\/\/[^/]+)\/s\/([^/?#]+)$/);
  if (!match) {
    throw new ValidationError(
      "URL must be https://host/s/{id}#{key}.",
      "INVALID_URL",
    );
  }

  return { origin: match[1], id: match[2], fragment };
}

export function validateHost(host: string): void {
  let parsed: URL;
  try {
    parsed = new URL(host);
  } catch {
    throw new ValidationError(`Invalid host URL: ${host}`, "INVALID_HOST");
  }

  if (parsed.protocol === "https:") return;
  if (
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
  ) {
    return;
  }
  throw new ValidationError(
    "Host must use HTTPS (HTTP allowed only for localhost).",
    "INVALID_HOST",
  );
}

export function validateLength(plaintext: string): void {
  if (plaintext.length > MAX_SECRET_LENGTH) {
    throw new ValidationError(
      `Secret exceeds ${MAX_SECRET_LENGTH} characters (got ${plaintext.length}).`,
      "PAYLOAD_TOO_LARGE",
    );
  }
  if (plaintext.length === 0) {
    throw new ValidationError("Secret is empty.", "INVALID_INPUT");
  }
}
