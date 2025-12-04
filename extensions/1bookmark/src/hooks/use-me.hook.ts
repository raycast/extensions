import { Cache, showToast, Toast } from "@raycast/api";
import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { useEffect } from "react";
import { useAtom } from "jotai";
import { sessionTokenAtom } from "../states/session-token.state";

const cache = new Cache();

export const useMe = (sessionToken: string) => {
  const [, setSessionToken] = useAtom(sessionTokenAtom);
  const me = trpc.user.me.useQuery(undefined, {
    enabled: !!sessionToken,

    initialData: () => {
      const cachedMe = cache.get("me");
      if (!cachedMe) {
        return undefined;
      }

      const initialData: RouterOutputs["user"]["me"] = JSON.parse(cachedMe);
      // Check compatibility of cache.
      if (!initialData.associatedSpaces[0]?.tags) {
        return undefined;
      }
      console.info("Cache hit useMe");
      return initialData;
    },
  });

  useEffect(() => {
    if (!me.data) return;

    cache.set("me", JSON.stringify(me.data));
  }, [me.data]);

  useEffect(() => {
    if (!me.error) return;

    if (me.error.shape?.data.httpStatus !== 401) {
      showToast({
        style: Toast.Style.Failure,
        title: "Login failed",
        message: "Try again later",
      });
      return;
    }

    // Login failed maybe due to token expiration.
    // Clear sessionToken and send to LoginView.
    setSessionToken("");
    showToast({
      style: Toast.Style.Failure,
      title: "Login required",
      message: "Please login again",
    });
  }, [me.error, setSessionToken]);

  return me;
};
