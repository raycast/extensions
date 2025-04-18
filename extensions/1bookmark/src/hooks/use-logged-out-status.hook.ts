import { useEffect, useRef } from "react";
import { useState } from "react";
import { useCachedState } from "@raycast/utils";
import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { cache } from "../utils/cache.util";
import {
  CACHED_KEY_SESSION_TOKEN,
  CACHED_KEY_ME,
  CACHED_KEY_MY_BOOKMARKS,
  CACHED_KEY_MY_TAGS,
} from "../utils/constants.util";

export const useLoggedOutStatus = () => {
  const [sessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  const [, setMe] = useCachedState<RouterOutputs["user"]["me"] | null>(CACHED_KEY_ME, null);
  const [, setBookmarks] = useCachedState<RouterOutputs["bookmark"]["listAll"] | null>(CACHED_KEY_MY_BOOKMARKS, null);
  const [, setTags] = useCachedState<RouterOutputs["tag"]["list"] | null>(CACHED_KEY_MY_TAGS, null);
  const [after1Sec, setAfter1Sec] = useState(sessionToken ? true : false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const cleared = useRef(false);

  const trpcUtils = trpc.useUtils();

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
      setMe(null);
      setBookmarks(null);
      setTags(null);
      // cache.clear();

      trpcUtils.user.me.reset(undefined, { cancelRefetch: true });
      trpcUtils.bookmark.listAll.reset(undefined, { cancelRefetch: true });
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
