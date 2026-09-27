import { randomUUID } from "node:crypto";
import { McpNetworkError, TOO_SLOW, UNREACHABLE } from "./mcp";

export const LEASE_KEY = "oauth-refresh-lease";
export const LEASE_MS = 30_000;
export const REFRESH_TIMEOUT_MS = LEASE_MS - 10_000;
export const CODE_EXCHANGE_TIMEOUT_MS = 60_000;
export const SIGN_IN_KEY = "oauth-signing-in";
export const SIGN_IN_HEARTBEAT_MS = 5_000;
export const SIGN_IN_STALE_MS = 15_000;
export const SIGN_IN_MAX_WAIT_MS = 600_000;
export const SIGN_IN_POLL_MS = 1_000;
export const SIGN_IN_STALE_RECHECK_MS = SIGN_IN_HEARTBEAT_MS + 2_000;
export const TOOL_SIGN_IN_WAIT_MS = 60_000;
export const SIGN_IN_ELSEWHERE = "Finish signing in to SocialFaktory in the other window, then ask again.";
export const SIGN_IN_UNFINISHED = "Finish signing in to SocialFaktory in your browser, then ask again.";
export const CONNECTION_RENEWAL =
  "The connection to SocialFaktory needs to be renewed. Run the command again to sign in again.";

const WAIT_STEP_MS = 250;
const SETTLE_MIN_MS = 150;
const SETTLE_SPREAD_MS = 250;
const SETTLE_CHECKS = 2;

export type TokenSnapshot = {
  accessToken: string;
  refreshToken?: string;
  expired: boolean;
};

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

export type KeyValueStorage = {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type Timing = {
  storage: KeyValueStorage;
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
  random(): number;
};

export type RefreshDependencies = Timing & {
  readTokens(): Promise<TokenSnapshot | undefined>;
  saveTokens(response: TokenResponse, previousRefreshToken: string): Promise<void>;
  refresh(refreshToken: string): Promise<TokenResponse>;
  forgetTokens(staleAccessToken: string): Promise<void>;
};

export type SignInDependencies = Timing & {
  readTokens(): Promise<TokenSnapshot | undefined>;
  signInWithBrowser(consented: () => void): Promise<string>;
  waiting?(active: boolean): void;
  waitLimitMs?: number;
  takeOver?: boolean;
  browserLimitMs?: number;
  adopt?: boolean;
  beforeBrowser?(): Promise<void>;
};

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

type Marker = { owner: string; at: number };

export class TokenEndpointError extends Error {
  code: string | undefined;
  status: number;

  constructor(code: string | undefined, status: number, message: string) {
    super(message);
    this.name = "TokenEndpointError";
    this.code = code;
    this.status = status;
  }

  get rejected(): boolean {
    return this.code === "invalid_grant" || this.code === "invalid_client";
  }
}

export class TokenTimeoutError extends Error {
  constructor() {
    super(CONNECTION_RENEWAL);
    this.name = "TokenTimeoutError";
  }
}

export async function refreshAccessToken(
  dependencies: RefreshDependencies,
  staleAccessToken: string,
): Promise<string | undefined> {
  const before = await dependencies.readTokens();
  const rotated = newer(before, staleAccessToken);
  if (rotated) return rotated;
  if (!before?.refreshToken) return undefined;

  return withLease(dependencies, LEASE_KEY, async () => {
    const current = await dependencies.readTokens();
    const rotatedMeanwhile = newer(current, staleAccessToken);
    if (rotatedMeanwhile) return rotatedMeanwhile;
    if (!current?.refreshToken) return undefined;

    let response: TokenResponse;
    try {
      response = await dependencies.refresh(current.refreshToken);
    } catch (error) {
      const recovered = newer(await dependencies.readTokens(), staleAccessToken);
      if (recovered) return recovered;
      if (error instanceof TokenTimeoutError) await dependencies.forgetTokens(current.accessToken);
      if (error instanceof TokenEndpointError && error.rejected) return undefined;
      throw error;
    }

    const latest = await dependencies.readTokens();
    if (latest?.refreshToken !== current.refreshToken) return newer(latest, staleAccessToken);
    await dependencies.saveTokens(response, current.refreshToken);
    return response.access_token;
  });
}

export async function withLease<T>(timing: Timing, key: string, work: () => Promise<T>): Promise<T> {
  const owner = randomUUID();
  await acquireLease(timing, key, owner);
  try {
    return await work();
  } finally {
    await releaseMarker(timing, key, owner);
  }
}

export async function signInOnce(
  dependencies: SignInDependencies,
  staleAccessToken: string | undefined,
): Promise<string> {
  const owner = randomUUID();
  const started = dependencies.now();
  const adopting = dependencies.adopt !== false;
  let announced = false;
  try {
    for (;;) {
      const marker = await readMarker(dependencies.storage, SIGN_IN_KEY);
      const finished = adopting ? newer(await dependencies.readTokens(), staleAccessToken) : undefined;
      if (finished) return finished;
      const now = dependencies.now();
      if (now - started >= (dependencies.waitLimitMs ?? SIGN_IN_MAX_WAIT_MS)) {
        if (dependencies.takeOver === false) throw new Error(SIGN_IN_ELSEWHERE);
        await writeMarker(dependencies.storage, SIGN_IN_KEY, owner, now);
        break;
      }
      if (held(marker, owner, now, SIGN_IN_STALE_MS)) {
        if (!announced) dependencies.waiting?.(true);
        announced = true;
        await dependencies.sleep(SIGN_IN_POLL_MS);
        continue;
      }
      if (marker && marker.owner !== owner) {
        if (!announced) dependencies.waiting?.(true);
        announced = true;
        await dependencies.sleep(SIGN_IN_STALE_RECHECK_MS);
        const again = await readMarker(dependencies.storage, SIGN_IN_KEY);
        if (!again || again.owner !== marker.owner || again.at !== marker.at) continue;
      }
      await writeMarker(dependencies.storage, SIGN_IN_KEY, owner, dependencies.now());
      if (await confirmMarker(dependencies, SIGN_IN_KEY, owner)) break;
    }
  } finally {
    if (announced) dependencies.waiting?.(false);
  }

  const finished = adopting ? newer(await dependencies.readTokens(), staleAccessToken) : undefined;
  if (finished) {
    await releaseMarker(dependencies, SIGN_IN_KEY, owner);
    return finished;
  }
  try {
    await dependencies.beforeBrowser?.();
  } catch (error) {
    await releaseMarker(dependencies, SIGN_IN_KEY, owner).catch(() => undefined);
    throw error;
  }
  return signInWithHeartbeat(dependencies, owner);
}

async function signInWithHeartbeat(dependencies: SignInDependencies, owner: string): Promise<string> {
  const stop = new AbortController();
  let consented = false;
  const signingIn = dependencies.signInWithBrowser(() => {
    consented = true;
  });
  let beat: Promise<void> = Promise.resolve();
  void (async () => {
    while (!stop.signal.aborted) {
      await dependencies.sleep(SIGN_IN_HEARTBEAT_MS, stop.signal);
      if (stop.signal.aborted) return;
      beat = writeMarker(dependencies.storage, SIGN_IN_KEY, owner, dependencies.now()).catch(() => undefined);
      await beat;
    }
  })();
  try {
    return await withinLimit(dependencies, signingIn, stop.signal, () => consented);
  } finally {
    stop.abort();
    await beat;
    await releaseMarker(dependencies, SIGN_IN_KEY, owner).catch(() => undefined);
  }
}

function withinLimit(
  dependencies: SignInDependencies,
  signingIn: Promise<string>,
  stop: AbortSignal,
  consented: () => boolean,
): Promise<string> {
  const limit = dependencies.browserLimitMs;
  if (limit === undefined) return signingIn;
  signingIn.catch(() => undefined);
  const expired = dependencies.sleep(limit, stop).then(() => {
    if (stop.aborted || consented()) return signingIn;
    throw new Error(SIGN_IN_UNFINISHED);
  });
  return Promise.race([signingIn, expired]);
}

export async function requestTokens(
  fetcher: Fetch,
  url: string,
  params: Record<string, string>,
  timeoutMs: number,
): Promise<TokenResponse> {
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") throw new TokenTimeoutError();
    throw new McpNetworkError(UNREACHABLE);
  }
  if (response.ok) return (await response.json()) as TokenResponse;

  const body = await readOAuthError(response);
  throw new TokenEndpointError(
    body.error,
    response.status,
    `SocialFaktory could not complete the sign in: ${body.error_description ?? body.error ?? response.status}`,
  );
}

export async function registerClient(
  fetcher: Fetch,
  url: string,
  redirectUri: string,
  scope: string,
  timeoutMs: number,
): Promise<string> {
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_name: "Raycast",
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new McpNetworkError(timedOut ? TOO_SLOW : UNREACHABLE, timedOut);
  }
  if (!response.ok) {
    const body = await readOAuthError(response);
    throw new Error(
      `SocialFaktory did not register Raycast: ${body.error_description ?? body.error ?? response.status}`,
    );
  }
  const { client_id } = (await response.json()) as { client_id: string };
  return client_id;
}

export async function readOAuthError(response: Response): Promise<{ error?: string; error_description?: string }> {
  try {
    return (await response.json()) as { error?: string; error_description?: string };
  } catch {
    return {};
  }
}

function newer(tokens: TokenSnapshot | undefined, staleAccessToken: string | undefined): string | undefined {
  if (!tokens || tokens.expired || tokens.accessToken === staleAccessToken) return undefined;
  return tokens.accessToken;
}

async function acquireLease(dependencies: Timing, key: string, owner: string): Promise<void> {
  for (;;) {
    const lease = await readMarker(dependencies.storage, key);
    if (held(lease, owner, dependencies.now(), LEASE_MS)) {
      await dependencies.sleep(WAIT_STEP_MS);
      continue;
    }
    await writeMarker(dependencies.storage, key, owner, dependencies.now());
    if (await confirmMarker(dependencies, key, owner)) return;
  }
}

async function confirmMarker(dependencies: Timing, key: string, owner: string): Promise<boolean> {
  for (let check = 0; check < SETTLE_CHECKS; check += 1) {
    await dependencies.sleep(SETTLE_MIN_MS + dependencies.random() * SETTLE_SPREAD_MS);
    if ((await readMarker(dependencies.storage, key))?.owner !== owner) return false;
  }
  return true;
}

function writeMarker(storage: KeyValueStorage, key: string, owner: string, at: number): Promise<void> {
  return storage.setItem(key, JSON.stringify({ owner, at }));
}

function held(marker: Marker | undefined, owner: string | undefined, now: number, ttl: number): boolean {
  return marker !== undefined && marker.owner !== owner && marker.at <= now && now - marker.at < ttl;
}

async function releaseMarker(dependencies: Timing, key: string, owner: string): Promise<void> {
  if ((await readMarker(dependencies.storage, key))?.owner === owner) await dependencies.storage.removeItem(key);
}

async function readMarker(storage: KeyValueStorage, key: string): Promise<Marker | undefined> {
  const value = await storage.getItem(key);
  if (!value) return undefined;
  try {
    const marker = JSON.parse(value) as Partial<Marker>;
    if (typeof marker.owner !== "string" || typeof marker.at !== "number") return undefined;
    return { owner: marker.owner, at: marker.at };
  } catch {
    return undefined;
  }
}
