import { getPreferenceValues } from "@raycast/api";
import type { SonarrInstance, SonarrInstanceId } from "@/lib/types/instance";
import type { SonarrPreferences } from "@/lib/types/preferences";

const DEFAULT_PRIMARY_NAME = "Main";
const DEFAULT_SECONDARY_NAME = "Second Instance";

/**
 * Raycast returns `undefined` for an optional preference that was never filled
 * in — observed on Windows, where macOS hands back an empty string. Reading a
 * preference through this helper instead of calling `.trim()` on it directly is
 * what keeps the extension from crashing on a fresh Windows setup.
 */
function readPreference(value: string | undefined | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolves a Sonarr base URL from the granular connection preferences.
 *
 * `host` is meant to hold a bare hostname or IP, with the port in its own
 * value. Full URLs (`http://sonarr.example.com:8989`) and `host:port` forms are
 * still normalized here so configurations created while those were advertised
 * keep working.
 *
 * Both instances describe themselves with the same four preferences and are
 * resolved through this one function, so neither can end up with URL handling
 * the other does not have. It is also the single place that reads the
 * connection preferences: API requests and the "Open in Sonarr" browser links
 * both build on it, so they cannot disagree about where an instance lives.
 */
export function buildSonarrBaseUrl(parts: {
  host: string | undefined;
  port?: string | undefined;
  base?: string | undefined;
  protocol?: string | undefined;
}): string {
  const rawHost = readPreference(parts.host);
  const rawPort = readPreference(parts.port);
  const rawBase = readPreference(parts.base);

  if (!rawHost) {
    return "";
  }

  let protocol = readPreference(parts.protocol) || "http";
  let host = rawHost;
  let port = rawPort;
  let baseFromHost = "";

  if (/^https?:\/\//i.test(rawHost)) {
    try {
      const parsed = new URL(rawHost);
      protocol = parsed.protocol.replace(":", "");
      host = parsed.hostname;
      // An explicit URL fully describes the endpoint: no port means the
      // scheme default, not the Port preference. Appending it here would
      // break the common `https://sonarr.example.com` reverse-proxy setup.
      port = parsed.port;
      baseFromHost = parsed.pathname === "/" ? "" : parsed.pathname;
    } catch {
      // Keep the original values and let the request fail with a clear error.
    }
  } else {
    const slashIndex = host.indexOf("/");

    if (slashIndex !== -1) {
      baseFromHost = host.slice(slashIndex + 1);
      host = host.slice(0, slashIndex);
    }

    const hostPortMatch = host.match(/^(.+):(\d+)$/);
    if (hostPortMatch) {
      host = hostPortMatch[1];
      port = hostPortMatch[2];
    }
  }

  host = host.replace(/\/+$/g, "");
  const basePath = (rawBase || baseFromHost).replace(/^\/|\/$/g, "");

  if (!host) {
    return "";
  }

  return `${protocol}://${host}${port ? `:${port}` : ""}${basePath ? `/${basePath}` : ""}`;
}

function getPrimaryInstance(preferences: SonarrPreferences): SonarrInstance {
  return {
    id: "primary",
    name: readPreference(preferences.instanceName) || DEFAULT_PRIMARY_NAME,
    url: buildSonarrBaseUrl({
      host: preferences.host,
      port: preferences.port,
      base: preferences.base,
      protocol: preferences.http,
    }),
    apiKey: readPreference(preferences.apiKey),
  };
}

function getSecondaryInstance(preferences: SonarrPreferences): SonarrInstance | null {
  if (!preferences.enableSecondaryInstance) {
    return null;
  }

  const url = buildSonarrBaseUrl({
    host: preferences.secondaryHost,
    port: preferences.secondaryPort,
    base: preferences.secondaryBase,
    protocol: preferences.secondaryHttp,
  });
  const apiKey = readPreference(preferences.secondaryApiKey);

  if (!url || !apiKey) {
    return null;
  }

  return {
    id: "secondary",
    name: readPreference(preferences.secondaryInstanceName) || DEFAULT_SECONDARY_NAME,
    url,
    apiKey,
  };
}

/**
 * Every configured and usable instance, primary first. The primary instance is
 * always present: its preferences are required, so an incomplete one still
 * surfaces here and fails with a real connection error instead of silently
 * leaving the extension with nothing to talk to.
 */
export function getSonarrInstances(): SonarrInstance[] {
  const preferences = getPreferenceValues<SonarrPreferences>();
  const instances = [getPrimaryInstance(preferences)];
  const secondary = getSecondaryInstance(preferences);

  if (secondary) {
    instances.push(secondary);
  }

  return instances;
}

/** The instance preferences point at, used until the user switches at runtime. */
export function getPreferredInstanceId(): SonarrInstanceId {
  const preferences = getPreferenceValues<SonarrPreferences>();
  return readPreference(preferences.activeInstance) === "secondary" ? "secondary" : "primary";
}

/**
 * Explains why an enabled second instance is not usable, so the Instance Status
 * command can point at the missing preference instead of just not listing it.
 */
export function getSecondaryInstanceIssue(): string | null {
  const preferences = getPreferenceValues<SonarrPreferences>();

  if (!preferences.enableSecondaryInstance) {
    return null;
  }

  const missing: string[] = [];

  if (!readPreference(preferences.secondaryHost)) {
    missing.push("Second Instance Host");
  }

  if (!readPreference(preferences.secondaryApiKey)) {
    missing.push("Second Instance API Key");
  }

  return missing.length > 0 ? `Missing ${missing.join(" and ")}` : null;
}
