import { useCallback } from "react";
import { useCachedState } from "@raycast/utils";

import { getUser } from "../utils";
import { useBase } from "./base";

export function useUser() {
  const [cachedUser, setCachedUser] = useCachedState<WakaTime.User>("user");

  const result = useBase({
    handler: useCallback(async () => {
      const user = await getUser();
      if (user.ok) setCachedUser(user.result);
      return user;
    }, []),
    toasts: {
      loading: { title: "Loading..." },
      success: { title: "Done!!" },
      error: (err) => ({
        title: "Failed fetching data!",
        message: err.message,
      }),
    },
  });

  return { ...result, data: cachedUser };
}
