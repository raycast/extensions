import { Cache } from "@raycast/api";
import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { useEffect } from "react";

const cache = new Cache();

export const useMe = (sessionToken: string) => {
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

  return me;
};
