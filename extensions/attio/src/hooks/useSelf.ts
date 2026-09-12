import { createHash } from "node:crypto";
import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { logger } from "@chrismessina/raycast-logger";
import { useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSelf } from "../api/endpoints";
import { parseScopes } from "../api/operations";

const { access_token } = getPreferenceValues<Preferences>();
const log = logger.child("[Self]");

/**
 * Non-secret cache namespace: changing the token must invalidate every cached
 * view, or the old token's workspace and scopes render (spec §5.2). Never log.
 */
export const tokenFingerprint = createHash("sha256")
  .update(access_token ?? "")
  .digest("hex")
  .slice(0, 8);

/** Bump CACHE_VERSION when any cached payload's SHAPE changes — stale persisted
 *  entries from older builds otherwise resurface with missing fields
 *  (live crash 2026-09-02: pre-normalization tasks served from cache). */
const CACHE_VERSION = "2";
export const cacheNs = `${tokenFingerprint}:${CACHE_VERSION}`;

export function useSelf() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    // fp is unused inside but keys the cache — see spec §5.2.
    async (_fp: string) => {
      const self = await getSelf();
      // Cache PLAIN JSON only: a Set round-trips through this cache as {}
      // and silently hides every action in the extension (spec §5.1).
      return {
        active: self.active,
        scope: self.scope ?? "",
        name: self.workspace_name ?? null,
        slug: self.workspace_slug ?? null,
        logoUrl: self.workspace_logo_url ?? null,
        memberId: self.authorized_by_workspace_member_id ?? null,
      };
    },
    [cacheNs],
    {
      // The guard owns this failure (spec §6/§14: a malformed token 400s
      // here) — no default toast, nothing unhandled.
      onError: (error: unknown) => {
        log.error("self failed", { message: getErrorMessage(error) });
      },
    },
  );

  const granted: ReadonlySet<string> = useMemo(() => new Set(parseScopes(data?.scope)), [data?.scope]);

  return {
    workspace:
      data?.active && data.slug ? { name: data.name ?? data.slug, slug: data.slug, logoUrl: data.logoUrl } : undefined,
    granted,
    isActive: data?.active, // undefined while loading (spec §5.3: 200 + active:false = revoked token)
    memberId: data?.memberId ?? undefined,
    isLoading,
    error,
    revalidate,
  };
}
