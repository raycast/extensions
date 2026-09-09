import { showError } from "@chrismessina/raycast-kit";
import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { logger } from "@chrismessina/raycast-logger";
import { openExtensionPreferences } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { isAuthError, isNetworkError, isRateLimited } from "../api/errors";
import { missingScopes, OPERATIONS, type Operation } from "../api/operations";
import type { GuardViewInput } from "../components/Guard";
import { cacheNs, useSelf } from "./useSelf";

const log = logger.child("[Data]");

/**
 * Scope-gated useCachedPromise (spec §7). `execute` stays false until self has
 * resolved AND every required scope is satisfied — a partial-scope token must
 * never fire the forbidden request (the guard explains it instead, pre-flight).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAttio<Fn extends (...args: any[]) => any>(
  op: Operation,
  fn: Fn,
  deps: Parameters<Fn> extends never ? unknown[] : unknown[],
  opts?: { initialData?: unknown },
) {
  const self = useSelf();
  const missing = missingScopes(self.granted, op);
  const ready = self.isActive === true && missing.length === 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fpFn = (_fp: string, ...args: any[]) => fn(...args);
  // The op name MUST be part of the cache key: every useAttio call shares the
  // same fpFn wrapper, and useCachedPromise namespaces by hash(fn) + hash(args)
  // — so two ops with identical deps (e.g. listTasks and listMembers, both
  // [cacheNs]) collide into ONE persisted entry. Live crash class 2026-09-02:
  // Tasks rendered a cached members array (no assignees field).
  const result = useCachedPromise(fpFn, [`${cacheNs}:${op}`, ...deps] as [string, ...Parameters<Fn>], {
    execute: ready,
    ...(opts?.initialData !== undefined ? { initialData: opts.initialData } : {}),
    onError: (error: unknown) => {
      // Supplying ANY onError suppresses Raycast's built-in failure toast;
      // the toast/screen split is the spec §7 table.
      if (isNetworkError(error)) {
        log.log(`${op}: network failure, guard owns the screen`);
        return;
      }
      if (isAuthError(error)) {
        showFailureToast(error, {
          title: "Attio rejected this access token",
          primaryAction: { title: "Open Extension Settings", onAction: () => openExtensionPreferences() },
        });
        return;
      }
      if (isRateLimited(error)) {
        showError(error, { title: "Attio is rate limiting this workspace" });
        return;
      }
      const message = getErrorMessage(error);
      log.error(`${op} failed`, { message });
      showError(error, { title: `Couldn't load from Attio` });
    },
  });

  const retry = () => {
    self.revalidate(); // scopes may have just been edited in Attio
    if (ready) result.revalidate(); // never fire a request the gate would block
  };

  const guardInput = (hasLiveData: boolean, onRetry?: () => void): Omit<GuardViewInput, never> => ({
    selfIsActive: self.isActive,
    selfIsLoading: self.isLoading,
    selfError: self.error,
    missing,
    error: result.error,
    hasLiveData,
    onRetry: onRetry ?? retry,
    errorDetail: result.error ? getErrorMessage(result.error) : undefined,
  });

  return { ...result, revalidate: retry, self, missing, ready, operation: OPERATIONS[op], guardInput };
}
