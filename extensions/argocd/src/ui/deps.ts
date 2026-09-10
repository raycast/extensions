/**
 * The single place where the pure lib layer is wired to the real world: the Raycast runtime,
 * the filesystem, the network and the argocd CLI. Everything below src/lib takes these as
 * arguments, which is what keeps it testable.
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { environment } from "@raycast/api";
import { join } from "node:path";
import { ArgoClient, type ClientDeps } from "../lib/argocd/client";
import { fetchOidcSettings } from "../lib/argocd/settings";
import { discover, refreshTokens } from "../lib/auth/oidc";
import { parseSession, serializeSession, type SsoSession } from "../lib/auth/session";
import { createSsoTokenReader } from "../lib/auth/sso";
import { probeInstance, type Reachability } from "../lib/argocd/probe";
import { ProjectionCache } from "../lib/cache/store";
import { readCliToken } from "../lib/auth/cliConfig";
import {
  clearCliSession,
  clearInstanceSecrets,
  clearSession,
  readCliSessionRaw,
  readSessionRaw,
  readToken,
  writeCliSessionRaw,
  writeSessionRaw,
  writeToken,
} from "../lib/auth/secrets";
import { createCliTokenReader } from "../lib/auth/cliSession";
import { createTokenProvider } from "../lib/auth/provider";
import { runSsoLogin } from "../lib/auth/login";
import type { ArgoInstance } from "../lib/config/instances";
import { readPreferences } from "./preferences";
import { secretStore } from "./storage";

/**
 * The credential accessors. Both live in Raycast's encrypted, extension-private storage, and
 * the SSO session is renewed here rather than anywhere the operator can see. Nothing about the
 * provider is hardcoded: it all comes from the instance's own settings endpoint.
 */
export async function readSsoSession(instanceId: string): Promise<SsoSession | undefined> {
  return parseSession(await readSessionRaw(secretStore, instanceId));
}

export async function writeSsoSession(instanceId: string, session: SsoSession): Promise<void> {
  await writeSessionRaw(secretStore, instanceId, serializeSession(session));
}

export async function clearSsoSession(instanceId: string): Promise<void> {
  await clearSession(secretStore, instanceId);
}

export function readApiToken(instanceId: string): Promise<string | undefined> {
  return readToken(secretStore, instanceId);
}

export function writeApiToken(instanceId: string, raw: string): Promise<void> {
  return writeToken(secretStore, instanceId, raw);
}

/** Called when an instance is removed, so nothing it owned is left behind. */
export function clearSecrets(instanceId: string): Promise<void> {
  return clearInstanceSecrets(secretStore, instanceId);
}

/** Shared by both OIDC-backed modes: neither hardcodes anything about the provider. */
const providerDeps = {
  readSettings: (instance: ArgoInstance) => fetchOidcSettings(instance.baseUrl, { fetch: globalThis.fetch }),
  discover: (issuer: string) => discover(issuer, { fetch: globalThis.fetch }),
  refresh: (
    endpoints: Parameters<typeof refreshTokens>[0]["endpoints"],
    clientId: string,
    refreshToken: string,
    scopes: string[],
  ) =>
    refreshTokens({ endpoints, clientId, refreshToken, scopes }, { fetch: globalThis.fetch, now: Date.now }),
  now: () => Date.now(),
};

/**
 * The argocd CLI session, renewed from the refresh token that `argocd login --sso` stored. The
 * renewal is kept in this extension's storage rather than written back into the CLI's config,
 * which belongs to the CLI.
 */
const readCliSessionToken = createCliTokenReader({
  readCliToken: (host) => readCliToken(host),
  readCachedSession: async (instanceId) => parseSession(await readCliSessionRaw(secretStore, instanceId)),
  writeCachedSession: (instanceId, session) =>
    writeCliSessionRaw(secretStore, instanceId, serializeSession(session)),
  clearCachedSession: (instanceId) => clearCliSession(secretStore, instanceId),
  ...providerDeps,
});

const readSsoToken = createSsoTokenReader({
  readSession: readSsoSession,
  writeSession: writeSsoSession,
  clearSession: clearSsoSession,
  ...providerDeps,
});

export const getToken = createTokenProvider({
  readCliToken: (host) => readCliToken(host),
  readStoredToken: readApiToken,
  readSsoToken,
  readCliSessionToken,
  now: () => new Date(),
});

export function makeClient(instance: ArgoInstance): ArgoClient {
  const { requestTimeoutSeconds } = readPreferences();
  const deps: ClientDeps = {
    fetch: globalThis.fetch,
    getToken,
    timeoutMs: requestTimeoutSeconds * 1000,
  };
  return new ArgoClient(instance, deps);
}

export function makeCache(): ProjectionCache {
  return new ProjectionCache(join(environment.supportPath, "cache"), {
    readFile: (path) => readFile(path, "utf8"),
    writeFile: (path, data) => writeFile(path, data, { encoding: "utf8", mode: 0o600 }),
    rename,
    mkdir: async (path) => {
      await mkdir(path, { recursive: true });
    },
    now: () => Date.now(),
  });
}

export function probe(instance: ArgoInstance): Promise<Reachability> {
  const { probeTimeoutSeconds } = readPreferences();
  return probeInstance(instance, {
    fetch: globalThis.fetch,
    now: () => Date.now(),
    timeoutMs: probeTimeoutSeconds * 1000,
  });
}

/**
 * Spawns `argocd login --sso` detached: the CLI opens the browser and serves the loopback
 * callback itself, then rewrites its config file, which is what the poller watches for.
 */
export function ssoLogin(host: string): Promise<{ token: string }> {
  const { argocdCliPath } = readPreferences();
  return runSsoLogin(host, argocdCliPath, {
    spawn: (file, args) => {
      const child = spawn(file, args, { detached: true, stdio: "ignore" });
      child.unref();
    },
    readToken: (target) => readCliToken(target),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
  });
}
