import { showToast, Toast } from "@raycast/api";
import { hostname } from "node:os";
import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { CACHED_KEY_ME } from "../utils/constants.util";
import { CACHED_KEY_SESSION_TOKEN } from "../utils/constants.util";

export const useMe = () => {
  const [sessionToken, setSessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  const [cachedData, setCachedData] = useCachedState<RouterOutputs["user"]["me"] | null>(CACHED_KEY_ME, null);

  const me = trpc.user.me.useQuery(
    {
      device: hostname(),
    },
    {
      enabled: !!sessionToken,
      initialData: () => {
        if (!cachedData) {
          return undefined;
        }

        if (!cachedData.associatedSpaces[0]?.tags) {
          setCachedData(null);
          return undefined;
        }

        console.info("Cache hit useMe");
        return cachedData;
      },
    },
  );

  useEffect(() => {
    if (!me.data) return;

    setCachedData(me.data);
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
    setCachedData(null);
    showToast({
      style: Toast.Style.Failure,
      title: "Login required",
      message: "Please login again",
    });
  }, [me.error, setSessionToken]);

  return me;
};
