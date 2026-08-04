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

// 다른 사용자로 로그인했을 때 로컬 전용 사용자 선호 캐시를 초기화하는 훅.
// 같은 사용자가 로그아웃 후 재로그인하면 선호도(disabled space, ranking 등)는 보존된다.
// 사용처: 로그인 후 me 쿼리가 도달하는 화면(예: search-bookmarks.tsx 진입부)에서 한 번 호출.
// NOTE: 영구 보존되는 user-scoped 캐시 키를 새로 추가하면 여기에도 추가해야 함
//       (web의 hooks/use-user-cache-reset.ts, mobile의 hooks/use-user-cache-reset.ts 도 동일).
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
