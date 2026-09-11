import { useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import {
  CACHED_KEY_DISABLED_SPACE_IDS,
  CACHED_KEY_LAST_LOGGED_IN_EMAIL,
  CACHED_KEY_RANKING_ENTRIES,
  CACHED_KEY_RECENT_SELECTED_SPACE,
  CACHED_KEY_RECENT_SELECTED_TAGS,
} from "../utils/constants.util";
import { RankingEntries } from "../types";

// Hook that resets the local-only user preference caches when a different user logs in.
// If the same user logs out and logs back in, preferences (disabled spaces, ranking, etc.) are preserved.
// Usage: call once on a screen reached after login where the me query resolves (e.g. the entry point of
// search-bookmarks.tsx).
// NOTE: when adding a new persistently stored user-scoped cache key, add it here as well
//       (likewise in web's hooks/use-user-cache-reset.ts and mobile's hooks/use-user-cache-reset.ts).
export const useUserCacheReset = (currentEmail: string | undefined) => {
  const [lastEmail, setLastEmail] = useCachedState<string>(CACHED_KEY_LAST_LOGGED_IN_EMAIL, "");
  const [, setDisabledSpaceIds] = useCachedState<string[]>(CACHED_KEY_DISABLED_SPACE_IDS, []);
  const [, setRankingEntries] = useCachedState<RankingEntries>(CACHED_KEY_RANKING_ENTRIES, {});
  const [, setRecentSelectedSpace] = useCachedState<string>(CACHED_KEY_RECENT_SELECTED_SPACE, "");
  const [, setRecentSelectedTags] = useCachedState<{ name: string; spaceId: string }[]>(
    CACHED_KEY_RECENT_SELECTED_TAGS,
    [],
  );

  useEffect(() => {
    if (!currentEmail) return;
    if (lastEmail && lastEmail !== currentEmail) {
      console.log(`🔁 user changed (${lastEmail} → ${currentEmail}), reset preference caches`);
      setDisabledSpaceIds([]);
      setRankingEntries({});
      setRecentSelectedSpace("");
      setRecentSelectedTags([]);
    }
    if (lastEmail !== currentEmail) {
      setLastEmail(currentEmail);
    }
  }, [currentEmail]);
};
