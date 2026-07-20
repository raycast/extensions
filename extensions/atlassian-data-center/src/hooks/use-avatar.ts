import path from "node:path";
import { useMemo } from "react";
import { useQueries, type UseQueryOptions } from "@tanstack/react-query";
import { environment } from "@raycast/api";

import { downloadAvatar } from "@/utils";
import { CURRENT_APP_TYPE, CURRENT_PAT } from "@/constants";
import { useAvatarCache } from "@/hooks";
import type { AvatarType } from "@/types";

type AvatarItem = {
  key: string;
  url: string;
};

type UseAvatarOptions<T> = {
  items: T[];
  avatarType: AvatarType;
  collectAvatars: (items: T[]) => AvatarItem[];
};

type AvatarQueryKey = readonly [
  {
    scope: string;
    entity: "avatar";
    type: AvatarType;
    url: string;
    key: string;
  },
];

type AvatarQueryOptions = UseQueryOptions<string, Error, string, AvatarQueryKey>;

export function useAvatar<T>({ items, avatarType, collectAvatars }: UseAvatarOptions<T>) {
  const avatarCache = useAvatarCache(avatarType);
  const avatarList = useMemo(() => collectAvatars(items), [items, collectAvatars]);

  const uniqueList = useMemo(() => {
    return avatarList.filter(
      (item, index, self) => !avatarCache.has(item.key) && self.findIndex((a) => a.url === item.url) === index,
    );
  }, [avatarList, avatarCache]);

  useQueries({
    queries: uniqueList.map(
      (item): AvatarQueryOptions => ({
        queryKey: [{ scope: CURRENT_APP_TYPE, entity: "avatar", type: avatarType, url: item.url, key: item.key }],
        queryFn: async ({ queryKey }) => {
          const [{ type, url, key }] = queryKey;
          const localPath = await downloadAvatar({ token: CURRENT_PAT, type, url, key });

          // Convert to relative path for storage to save space
          const relativePath = path.relative(environment.supportPath, localPath);
          avatarCache.set(key, path.normalize(relativePath));

          return relativePath;
        },
        staleTime: Infinity,
        gcTime: Infinity,
      }),
    ),
    combine: (results) => results.filter((result) => result.isSuccess).length,
  });
}
