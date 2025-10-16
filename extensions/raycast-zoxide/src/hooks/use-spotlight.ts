import { useExec } from "@raycast/utils";
import { makeUnfriendly } from "@utils/path-helpers";
import { base64ShellSanitize } from "@utils/misc";

export const useSpotlight = (query: string, options?: object) => {
  options = {
    shell: true,
    env: {
      PATH: "/usr/bin",
    },
    ...options,
  };
  query = base64ShellSanitize(makeUnfriendly(query));
  const filters = [`kMDItemContentType=='public.folder'`, `kMDItemDisplayName=='*${query}*'cd`, `kMDItemUseCount > 0`];
  return useExec(`mdfind "${filters.join(" && ")}"`, options);
};
