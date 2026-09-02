import { useEffect, useRef } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCachedState } from "@raycast/utils";
import { RouterOutputs } from "@/utils/trpc.util";
import { CachedMyBookmarks } from "../types";
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
  // Local mirror of server data. Must not be exposed to another user, so clear it immediately on logout.
  const [, setMe] = useCachedState<RouterOutputs["user"]["me"] | null>(CACHED_KEY_ME, null);
  const [, setBookmarks] = useCachedState<CachedMyBookmarks | null>(CACHED_KEY_MY_BOOKMARKS, null);
  const [, setTags] = useCachedState<RouterOutputs["tag"]["list"] | null>(CACHED_KEY_MY_TAGS, null);
  // Transient state of the short-lived auth flow — clear immediately on logout.
  const [, setSpaceVerifyingAuthEmail] = useCachedState<string | undefined>(
    CACHED_KEY_SPACE_VERIFYING_AUTH_EMAIL,
    undefined,
  );
  const [, setSpaceAuthCodeSent] = useCachedState<boolean>(CACHED_KEY_SPACE_AUTH_CODE_SENT, false);
  // Local-only user preferences — left untouched on logout so they survive re-login with the same ID;
  // they are reset only when a different user logs in (use-user-cache-reset.hook).
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
      // Immediately clear only security-sensitive caches (those that must not be exposed to another user).
      setMe(null);
      setBookmarks(null);
      setTags(null);
      setSpaceVerifyingAuthEmail(undefined);
      setSpaceAuthCodeSent(false);
      // disabledSpaceIds / rankingEntries / recentSelectedSpace / recentSelectedTags are
      // intentionally not cleared here so they survive re-login with the same ID.
      // CACHED_KEY_LAST_LOGGED_IN_EMAIL is kept for comparison on the next login.

      // The React Query in-memory cache is a singleton that lives for the whole process, so resetting
      // only some queries would let the previous user's data in the remaining queries (tag.list,
      // space.get, spaceAuth.*, etc.) be reused on re-login. Reset the entire server-data cache instead.
      // At this point the session token is empty, so queries are disabled/unmounted and no refetch occurs.
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
