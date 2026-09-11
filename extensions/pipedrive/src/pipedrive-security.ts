export type DomainValidationResult = { ok: true; domain: string } | { ok: false; error: string };

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function validatePipedriveDomain(input: string): DomainValidationResult {
  const raw = (input || "").trim();
  if (!raw) {
    return { ok: false, error: "Pipedrive domain is required" };
  }

  if (raw.includes("@")) {
    return { ok: false, error: "Pipedrive domain must not include '@'" };
  }

  let host = raw;

  if (raw.startsWith("https://") || raw.startsWith("http://")) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== "https:") {
        return { ok: false, error: "Pipedrive domain must use https" };
      }
      if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
        return { ok: false, error: "Enter only the domain (no path/query)" };
      }
      host = parsed.hostname;
    } catch {
      return { ok: false, error: "Invalid Pipedrive domain" };
    }
  }

  host = host.trim().toLowerCase();

  if (/[\s/?#]/.test(host)) {
    return { ok: false, error: "Enter only the domain (no spaces, path, or query)" };
  }

  try {
    const parsed = new URL(`https://${host}`);
    if (parsed.hostname !== host || parsed.pathname !== "/") {
      return { ok: false, error: "Invalid Pipedrive domain" };
    }
  } catch {
    return { ok: false, error: "Invalid Pipedrive domain" };
  }

  if (!host.endsWith(".pipedrive.com")) {
    return { ok: false, error: "Pipedrive domain must end with .pipedrive.com" };
  }

  return { ok: true, domain: host };
}

export function assertValidPipedriveDomain(input: string): string {
  const result = validatePipedriveDomain(input);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.domain;
}

export function redactPipedriveSecrets(text: string, apiToken?: string): string {
  let out = text;

  out = out.replace(/api_token=([^&\s]+)/gi, "api_token=[REDACTED]");
  out = out.replace(/("api_token"\s*:\s*")([^"]+)(")/gi, "$1[REDACTED]$3");

  if (apiToken) {
    out = out.replace(new RegExp(escapeRegExp(apiToken), "g"), "[REDACTED]");
  }

  return out;
}
