import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { useEffect, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { CACHED_KEY_MY_TAGS, CACHED_KEY_SESSION_TOKEN } from "../utils/constants.util";
import { useEnabledSpaces } from "./use-enabled-spaces.hook";

export const useMyTags = () => {
  const [sessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  const { enabledSpaceIds } = useEnabledSpaces();

  const [cached, setCached] = useCachedState<RouterOutputs["tag"]["list"] | null>(CACHED_KEY_MY_TAGS, null);
  const r = trpc.tag.list.useQuery(
    {
      spaceIds: enabledSpaceIds || [],
    },
    {
      enabled: !!sessionToken && !!enabledSpaceIds,
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

export const useTags = (spaceIdOrSpaceIds: string | string[]) => {
  const [sessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  const spaceIds = useMemo(() => {
    return Array.isArray(spaceIdOrSpaceIds) ? spaceIdOrSpaceIds : [spaceIdOrSpaceIds];
  }, [spaceIdOrSpaceIds]);

  const r = trpc.tag.list.useQuery(
    { spaceIds },
    {
      enabled: !!sessionToken,
    },
  );

  return r;
};
