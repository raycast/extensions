import { Cache } from "@raycast/api";
import { RouterOutputs, trpc } from "@/utils/trpc.util";

const cache = new Cache();
const cachedMe = cache.get("me");

export const useMe = (sessionToken: string) => {
  const me = trpc.user.me.useQuery(undefined, {
    enabled: !!sessionToken,
    initialData: cachedMe
      ? () => {
          const initialData: RouterOutputs["user"]["me"] = JSON.parse(cachedMe);
          // cache 호환성 체크
          if (!initialData.associatedSpaces[0]?.tags) {
            return undefined;
          }
          console.info("Cache hit useMe");
          return initialData;
        }
      : undefined,
  });

  return me;
};
