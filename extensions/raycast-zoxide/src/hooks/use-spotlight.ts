import { useExec } from "@raycast/utils";
import { makeUnfriendly } from "@utils/path-helpers";

export const useSpotlight = (query: string, options?: object) => {
  options = {
    shell: true,
    env: {
      PATH: "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/opt/homebrew/sbin",
    },
    ...options,
  };
  const filters = [`kMDItemContentType=='public.folder'`, `kMDItemDisplayName=='*${query}*'cd`, `kMDItemUseCount > 0`];
  query = makeUnfriendly(query);
  return useExec(`mdfind "${filters.join(" && ")}"`, options);
};
