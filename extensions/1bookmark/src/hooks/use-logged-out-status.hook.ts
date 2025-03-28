import { useEffect, useRef } from "react";
import { useState } from "react";
import { useCachedState } from "@raycast/utils";
import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { cache } from "../views/MyAccount";

export const useLoggedOutStatus = () => {
  const [sessionToken] = useCachedState("session-token", "");
  const [, setMe] = useCachedState<RouterOutputs["user"]["me"] | null>("me", null);
  const [, setBookmarks] = useCachedState<RouterOutputs["bookmark"]["listAll"] | null>("my-bookmarks", null);
  const [, setTags] = useCachedState<RouterOutputs["tag"]["list"] | null>("tags", null);
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
