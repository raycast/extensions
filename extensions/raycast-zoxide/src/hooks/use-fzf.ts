import { useExec } from "@raycast/utils";
import { makeUnfriendly } from "@utils/path-helpers";

export const useFzf = (filterText: string, options?: object) => {
  options = {
    shell: true,
    timeout: 500,
    parseOutput: (args: { stdout: string; stderr?: string; error?: Error }): string => {
      if (!args.stdout.length || args.stderr?.length) return ""; // If no specified output or error, return empty string
      return args.stdout;
    },
    env: {
      PATH: "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/opt/homebrew/sbin",
    },
    ...options,
  };

  filterText = makeUnfriendly(filterText);
  return useExec(
    `fzf --exact --no-sort --cycle --info=inline --layout=reverse --exit-0 --filter "${filterText}" `,
    options,
  );
};
