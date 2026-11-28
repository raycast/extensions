import { OAuthTokenError, type TokenResponse } from "./token-exchange";

export interface StoredTokenSet {
  accessToken: string;
  refreshToken?: string;
  isExpired(): boolean;
}

export interface TokenStore {
  getTokens(): Promise<StoredTokenSet | undefined>;
  setTokens(tokens: TokenResponse): Promise<void>;
  removeTokens(): Promise<void>;
}

interface ResolveAccessTokenOptions {
  store: TokenStore;
  refresh(refreshToken: string): Promise<TokenResponse>;
  authorize(): Promise<TokenResponse>;
  allowAuthorization: boolean;
}

// All hooks in a command share the same store. Keep refresh and interactive
// authorization separate so optional/background reads never trigger a prompt.
const pendingSessions = new WeakMap<TokenStore, Promise<string | null>>();
const pendingAuthorizations = new WeakMap<TokenStore, Promise<string | null>>();
const pendingMutations = new WeakMap<TokenStore, Promise<unknown>>();
const generations = new WeakMap<TokenStore, number>();
export function invalidateSession(store: TokenStore) {
  generations.set(store, (generations.get(store) ?? 0) + 1);
  pendingSessions.delete(store);
  pendingAuthorizations.delete(store);
}

function mutate<T>(store: TokenStore, operation: () => Promise<T>): Promise<T> {
  const previous = pendingMutations.get(store) ?? Promise.resolve();
  const pending = previous
    .catch(() => {})
    .then(operation)
    .finally(() => {
      if (pendingMutations.get(store) === pending) pendingMutations.delete(store);
    });
  pendingMutations.set(store, pending);
  return pending;
}
export function removeSessionTokens(store: TokenStore): Promise<void> {
  invalidateSession(store);
  return mutate(store, () => store.removeTokens());
}
async function persist(
  store: TokenStore,
  expected: StoredTokenSet | undefined,
  replacement: TokenResponse | null,
  generation: number
): Promise<string | null> {
  return mutate(store, async () => {
    const current = await store.getTokens();
    if (
      (generations.get(store) ?? 0) !== generation ||
      current?.accessToken !== expected?.accessToken ||
      current?.refreshToken !== expected?.refreshToken
    )
      return null;
    if (replacement) await store.setTokens(replacement);
    else await store.removeTokens();
    return (generations.get(store) ?? 0) === generation ? (replacement?.access_token ?? null) : null;
  });
}

function singleFlight<T>(
  pending: WeakMap<TokenStore, Promise<T>>,
  store: TokenStore,
  run: () => Promise<T>
): Promise<T> {
  const existing = pending.get(store);
  if (existing) return existing;
  const promise = run().finally(() => {
    if (pending.get(store) === promise) pending.delete(store);
  });
  pending.set(store, promise);
  return promise;
}

export async function resolveAccessToken(options: ResolveAccessTokenOptions): Promise<string | null> {
  const { store, authorize, allowAuthorization } = options;
  const generation = generations.get(store) ?? 0;
  if (pendingMutations.has(store)) await pendingMutations.get(store);
  if ((generations.get(store) ?? 0) !== generation) return null;
  const token = await singleFlight(pendingSessions, store, () => resolveStoredAccessToken(options, generation));
  if ((generations.get(store) ?? 0) !== generation) return null;
  if (token || !allowAuthorization) return token;

  return singleFlight(pendingAuthorizations, store, async () => {
    const before = await store.getTokens();
    const authorizedTokens = await authorize();
    return persist(store, before, authorizedTokens, generation);
  });
}

async function resolveStoredAccessToken(
  { store, refresh }: ResolveAccessTokenOptions,
  generation: number
): Promise<string | null> {
  const storedTokens = await store.getTokens();

  if (storedTokens && !storedTokens.isExpired()) {
    return storedTokens.accessToken;
  }

  if (storedTokens?.refreshToken) {
    let refreshedTokens: TokenResponse;
    try {
      refreshedTokens = await refresh(storedTokens.refreshToken);
    } catch (error) {
      // Only an explicit invalid grant proves the refresh credentials unusable.
      // Network, throttling, server, malformed-response and configuration errors
      // must remain retryable without signing the user out.
      if (!(error instanceof OAuthTokenError && error.code === "invalid_grant" && error.status === 400)) {
        throw error;
      }
      await persist(store, storedTokens, null, generation);
      return null;
    }
    return persist(store, storedTokens, refreshedTokens, generation);
  } else if (storedTokens) {
    await persist(store, storedTokens, null, generation);
  }

  return null;
}
