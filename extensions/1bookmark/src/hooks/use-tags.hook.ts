import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { useEffect, useMemo } from "react";
import { useCachedState } from "@raycast/utils";

export const useTags = (spaceIdOrSpaceIds: string | string[]) => {
  const spaceIds = useMemo(() => {
    return Array.isArray(spaceIdOrSpaceIds) ? spaceIdOrSpaceIds : [spaceIdOrSpaceIds];
  }, [spaceIdOrSpaceIds]);
  const cacheKey = useMemo(() => `tags:${spaceIds.join(",")}`, [spaceIds]);
  const [cached, setCached] = useCachedState<RouterOutputs["tag"]["list"] | null>(cacheKey, null);

  const r = trpc.tag.list.useQuery(
    { spaceIds },
    {
      initialData: () => {
        if (!cached) {
          return undefined;
        }

        const initialData: RouterOutputs["tag"]["list"] = cached;
        console.info("Cache hit useTags");
        return initialData;
      },
    },
  );

  useEffect(() => {
    if (!r.data) return;

    setCached(r.data);
  }, [r.data]);

  return r;
};
