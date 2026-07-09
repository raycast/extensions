import { useEffect, useRef } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCachedState } from "@raycast/utils";
import { RouterOutputs } from "@/utils/trpc.util";
import { cache } from "../utils/cache.util";
import {
  CACHED_KEY_SESSION_TOKEN,
  CACHED_KEY_ME,
  CACHED_KEY_MY_BOOKMARKS,
  CACHED_KEY_MY_TAGS,
  CACHED_KEY_SPACE_VERIFYING_AUTH_EMAIL,
  CACHED_KEY_SPACE_AUTH_CODE_SENT,
} from "../utils/constants.util";

export const useLoggedOutStatus = () => {
  const [sessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  // 서버 데이터의 로컬 미러. 다른 유저에게 노출되면 안 되므로 로그아웃 시 즉시 클리어.
  const [, setMe] = useCachedState<RouterOutputs["user"]["me"] | null>(CACHED_KEY_ME, null);
  const [, setBookmarks] = useCachedState<RouterOutputs["bookmark"]["listAll"] | null>(CACHED_KEY_MY_BOOKMARKS, null);
  const [, setTags] = useCachedState<RouterOutputs["tag"]["list"] | null>(CACHED_KEY_MY_TAGS, null);
  // 단기 인증 흐름의 임시 상태 — 로그아웃 시 즉시 클리어.
  const [, setSpaceVerifyingAuthEmail] = useCachedState<string | undefined>(
    CACHED_KEY_SPACE_VERIFYING_AUTH_EMAIL,
    undefined,
  );
  const [, setSpaceAuthCodeSent] = useCachedState<boolean>(CACHED_KEY_SPACE_AUTH_CODE_SENT, false);
  // 로컬 전용 사용자 선호도 — 같은 ID 재로그인 시 보존하기 위해 로그아웃 시엔 그대로 두고,
  // 다른 사용자가 로그인하는 시점(use-user-cache-reset.hook)에서만 초기화한다.
  const [after1Sec, setAfter1Sec] = useState(sessionToken ? true : false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const cleared = useRef(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    // If this is not here, LoginView will briefly appear.
    if (after1Sec) return;

    const timer = setTimeout(() => setAfter1Sec(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const loggedOutStatus = !sessionToken && after1Sec;

  useEffect(() => {
    // Clear data when logged out.
    if (sessionToken) {
      cleared.current = false;
    } else if (loggedOutStatus && !cleared.current) {
      console.log("❌ clear cache");
      // 보안 민감(다른 유저에게 노출되면 안 되는) 캐시만 즉시 클리어.
      setMe(null);
      setBookmarks(null);
      setTags(null);
      setSpaceVerifyingAuthEmail(undefined);
      setSpaceAuthCodeSent(false);
      // disabledSpaceIds / rankingEntries / recentSelectedSpace / recentSelectedTags 는
      // 같은 ID 재로그인 시 보존되도록 여기서 클리어하지 않는다.
      // CACHED_KEY_LAST_LOGGED_IN_EMAIL 은 다음 로그인 비교용으로 유지.

      // React Query 메모리 캐시는 프로세스 동안 유지되는 싱글턴이라, 일부 쿼리만
      // reset하면 남은 쿼리(tag.list, space.get, spaceAuth.* 등)의 이전 사용자
      // 데이터가 재로그인 시 재사용될 수 있다. 서버 데이터 캐시를 통째로 reset한다.
      // 이 시점엔 세션 토큰이 비어 쿼리들이 disabled/unmount 상태라 refetch는 발생하지 않는다.
      queryClient.resetQueries();
      cleared.current = true;

      // force re-render to resolve the issue that
      // the component is not re-rendered when the user is logged out.
      const signOutTime = cache.get("signOutTime");
      if (signOutTime) {
        const now = new Date();
        const signOutDate = new Date(signOutTime);

        if (now.getTime() - signOutDate.getTime() < 1000) {
          setAfter1Sec(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => setAfter1Sec(true), 1000);
        }
      }
    }
  }, [loggedOutStatus]);

  return { loggedOutStatus };
};
