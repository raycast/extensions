import { useExec } from "@raycast/utils";
import { makeUnfriendly } from "@utils/path-helpers";
import { base64ShellSanitize } from "@utils/misc";

export const useFzf = (filterText: string, options?: object) => {
  options = {
    shell: true,
    parseOutput: (args: { stdout: string; stderr?: string; error?: Error }): string => {
      if (!args.stdout.length || args.stderr?.length) return ""; // If no specified output or error, return empty string
      return args.stdout;
    },
    env: {
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
    },
    ...options,
  };

  filterText = base64ShellSanitize(makeUnfriendly(filterText));
  return useExec(
    `fzf --exact --no-sort --cycle --info=inline --layout=reverse --exit-0 --filter "${filterText}"`,
    options,
  );
};
