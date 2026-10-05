/**
 * The instance registry. Instances are user data, not build-time configuration: a Raycast
 * preference cannot hold a variable number of entries, and hardcoding hostnames would put
 * internal topology in the repository.
 *
 * parseInstances reads storage a user can edit, so it repairs what it can and drops the rest
 * rather than throwing. The production write guard is applied on read as well as on write, so
 * hand-editing storage cannot turn a production instance into a writable one.
 */

export type Environment = "prod" | "preprod" | "dev";

/**
 * `sso` runs the OIDC login from the extension and renews silently from the refresh token,
 * which is the only mode that never asks for anything again. `cli` reuses whatever session the
 * argocd binary holds. `token` reads a token this extension stored.
 */
export type AuthMode = "sso" | "cli" | "token";

export interface ArgoInstance {
  id: string;
  name: string;
  baseUrl: string;
  env: Environment;
  authMode: AuthMode;
  allowWrite: boolean;
  enabled: boolean;
}

export interface InstanceDraft {
  id?: string;
  name: string;
  baseUrl: string;
  env: Environment;
  authMode: AuthMode;
  allowWrite?: boolean;
  enabled?: boolean;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

const ENVIRONMENTS: readonly Environment[] = ["prod", "preprod", "dev"];
const AUTH_MODES: readonly AuthMode[] = ["sso", "cli", "token"];

/**
 * Loopback by name or by address, including the IPv6 form the URL parser hands back in
 * brackets. Not a substring match: an attacker-chosen `localhost.example.com` must not pass.
 */
export function isLoopback(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("The server URL is required.", "baseUrl");
  }

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new ValidationError("The server URL is not a valid URL.", "baseUrl");
  }

  // Cleartext and a dotless hostname are allowed for loopback only. Traffic to loopback
  // never leaves the machine, so https buys nothing there, and it is how ArgoCD is reached
  // locally: kubectl port-forward svc/argocd-server, then argocd login localhost:8080
  // --plaintext. Everything else must be https, which is what protects a real token.
  if (!isLoopback(url.hostname)) {
    if (url.protocol !== "https:") {
      throw new ValidationError("The server URL must use https, except on localhost.", "baseUrl");
    }
    if (url.hostname.length === 0 || !url.hostname.includes(".")) {
      throw new ValidationError("The server URL must carry a hostname.", "baseUrl");
    }
  } else if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ValidationError("The server URL must use http or https.", "baseUrl");
  }

  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path}`;
}

export function instanceHost(instance: Pick<ArgoInstance, "baseUrl">): string {
  return new URL(instance.baseUrl).host;
}

export function validateInstance(draft: InstanceDraft, existing: ArgoInstance[], newId: () => string): ArgoInstance {
  const name = draft.name.trim();
  if (name.length === 0) {
    throw new ValidationError("The name is required.", "name");
  }

  const baseUrl = normalizeBaseUrl(draft.baseUrl);
  const id = draft.id ?? newId();

  const others = existing.filter((candidate) => candidate.id !== id);
  if (others.some((candidate) => candidate.name.toLowerCase() === name.toLowerCase())) {
    throw new ValidationError("Another instance already uses this name.", "name");
  }
  if (others.some((candidate) => candidate.baseUrl === baseUrl)) {
    throw new ValidationError("Another instance already points at this server.", "baseUrl");
  }

  if (!ENVIRONMENTS.includes(draft.env)) {
    throw new ValidationError("Unknown environment.", "env");
  }
  if (!AUTH_MODES.includes(draft.authMode)) {
    throw new ValidationError("Unknown authentication mode.", "authMode");
  }

  return {
    id,
    name,
    baseUrl,
    env: draft.env,
    authMode: draft.authMode,
    // A production instance is never writable from here. Server-side RBAC is the real control;
    // this keeps an accidental click from ever reaching it.
    allowWrite: draft.env === "prod" ? false : (draft.allowWrite ?? false),
    enabled: draft.enabled ?? true,
  };
}

/**
 * True when an edit invalidates whatever credential the instance already holds.
 *
 * An edit keeps the instance's id, so its stored session survives it. Point the instance at
 * another server, or switch its auth mode, and the old provider's token is still what gets
 * sent. The token reader cannot catch this on its common path: it returns a live session
 * without asking the server anything, which is what makes opening a command free, and
 * validating the provider binding there would cost a settings request on every read.
 *
 * So the invalidation happens here, once, at the edit.
 */
export function credentialsInvalidatedBy(previous: ArgoInstance, next: ArgoInstance): boolean {
  return previous.baseUrl !== next.baseUrl || previous.authMode !== next.authMode;
}

export function upsertInstance(instances: ArgoInstance[], instance: ArgoInstance): ArgoInstance[] {
  const index = instances.findIndex((candidate) => candidate.id === instance.id);
  if (index === -1) {
    return [...instances, instance];
  }
  const next = [...instances];
  next[index] = instance;
  return next;
}

export function removeInstance(instances: ArgoInstance[], id: string): ArgoInstance[] {
  return instances.filter((candidate) => candidate.id !== id);
}

function coerceInstance(raw: unknown): ArgoInstance | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  const value = raw as Record<string, unknown>;
  const { id, name, baseUrl, env, authMode } = value;

  if (typeof id !== "string" || id.length === 0) return undefined;
  if (typeof name !== "string" || name.length === 0) return undefined;
  if (typeof baseUrl !== "string") return undefined;
  if (typeof env !== "string" || !ENVIRONMENTS.includes(env as Environment)) return undefined;
  if (typeof authMode !== "string" || !AUTH_MODES.includes(authMode as AuthMode)) return undefined;

  let normalized: string;
  try {
    normalized = normalizeBaseUrl(baseUrl);
  } catch {
    return undefined;
  }

  const environment = env as Environment;
  return {
    id,
    name,
    baseUrl: normalized,
    env: environment,
    authMode: authMode as AuthMode,
    allowWrite: environment === "prod" ? false : value.allowWrite === true,
    enabled: value.enabled !== false,
  };
}

export function parseInstances(raw: string | undefined): ArgoInstance[] {
  if (!raw) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.map(coerceInstance).filter((instance): instance is ArgoInstance => instance !== undefined);
}

export function serializeInstances(instances: ArgoInstance[]): string {
  return JSON.stringify(instances);
}
