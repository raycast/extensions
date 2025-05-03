import { useExec } from "@raycast/utils";
import { makeUnfriendly } from "@utils/path-helpers";
import { base64ShellSanitize } from "@utils/misc";

export const useSpotlight = (query: string, options?: object): ReturnType<typeof useExec> => {
  options = {
    shell: true,
    env: {
      PATH: "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/opt/homebrew/sbin",
    },
    ...options,
  };
  query = base64ShellSanitize(makeUnfriendly(query));
  const filters = [`kMDItemContentType=='public.folder'`, `kMDItemDisplayName=='*${query}*'cd`, `kMDItemUseCount > 0`];
  return useExec(`mdfind "${filters.join(" && ")}"`, options);
};
