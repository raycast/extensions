import { isAuthError } from "./apiError";
import { isConnectionError } from "./connection";

/**
 * Whether a view should replace its content with the connection-recovery UI.
 *
 * Reactive by design: it reads the error the view's own fetch already produced
 * rather than pre-probing the server. A pre-flight check would add a round-trip
 * to every view for users on a hosted instance, who can never benefit from
 * Docker recovery — so the cost lands only on the path that has already failed.
 * (The create forms are the exception; they must know BEFORE a write, because
 * failing a write is what risks losing typed input.)
 *
 * `hasLiveData` must mean "a fetch SUCCEEDED this session" — NOT "the list is
 * non-empty". useCachedPromise persists its last value to disk ("the last value
 * will be kept between command runs"), so on a cold start against a dead server
 * `data` is already populated from the previous run. Gating on non-emptiness
 * therefore suppresses the guard exactly when it is needed and shows a stale
 * list as though it were current. Only a request that actually came back proves
 * the server is up.
 */
export function shouldGuard(error: unknown, hasLiveData: boolean): boolean {
  // A rejected API key ignores `hasLiveData` on purpose. That latch exists so a
  // TRANSIENT failure leaves good rows on screen; a 401 is not transient — every
  // later request fails the same way, and rows restored from the cache would be
  // presenting a stale snapshot as the live account.
  if (isAuthError(error)) return true;
  return isConnectionError(error) && !hasLiveData;
}
