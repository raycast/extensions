/**
 * The instance's own OIDC configuration, read from `GET /api/v1/settings`.
 *
 * That endpoint answers without authentication, which is what makes a first login possible at
 * all: the extension has to know the issuer and the client before it can ask anyone for a
 * token. It also means the extension never carries provider configuration of its own, so
 * pointing it at another ArgoCD needs nothing but the URL.
 *
 * `cliClientID` is the field that matters. ArgoCD's web client is confidential and refuses an
 * unauthenticated token exchange; `oidc.cliClientID` in argocd-cm exists so a public client can
 * be used for command-line and third-party logins, and this is where it surfaces.
 */

import { ApiError, NetworkError, TimeoutError } from "./errors";

export interface OidcSettings {
  issuer: string;
  /** The client to use for a PKCE login: cliClientID when set, the web client otherwise. */
  clientId: string;
  /** True when cliClientID was set, so a public client is in use as intended. */
  usesCliClient: boolean;
  scopes: string[];
  pkceEnabled: boolean;
  providerName: string | undefined;
}

export interface SettingsDeps {
  fetch: typeof globalThis.fetch;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function projectOidcSettings(raw: unknown): OidcSettings | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  const oidc = (raw as { oidcConfig?: unknown }).oidcConfig;
  if (typeof oidc !== "object" || oidc === null) {
    return undefined;
  }

  const config = oidc as Record<string, unknown>;
  const issuer = asString(config.issuer);
  const cliClientId = asString(config.cliClientID);
  const clientId = cliClientId ?? asString(config.clientID);
  if (!issuer || !clientId) {
    return undefined;
  }

  const scopes = Array.isArray(config.scopes)
    ? config.scopes.filter((scope): scope is string => typeof scope === "string")
    : [];

  return {
    issuer,
    clientId,
    usesCliClient: cliClientId !== undefined,
    scopes,
    pkceEnabled: config.enablePKCEAuthentication === true,
    providerName: asString(config.name),
  };
}

export async function fetchOidcSettings(baseUrl: string, deps: SettingsDeps): Promise<OidcSettings> {
  let response: Response;
  try {
    response = await deps.fetch(`${baseUrl}/api/v1/settings`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new TimeoutError("The instance did not answer its settings endpoint in time.");
    }
    throw new NetworkError("Could not reach the instance to read its login settings.");
  }

  if (!response.ok) {
    throw new ApiError(`The instance answered ${response.status} on its settings endpoint.`, response.status);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("The instance's settings endpoint did not return JSON.", response.status);
  }

  const settings = projectOidcSettings(body);
  if (!settings) {
    throw new ApiError(
      "This instance reports no OIDC configuration, so there is no single sign-on to use. Configure an API token instead.",
      response.status,
    );
  }
  return settings;
}
