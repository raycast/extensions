import { useExec } from "@raycast/utils";
import { pathFor } from "@utils/path-helpers";

export const useZoxide = (command: string, options?: object) => {
  options = {
    shell: true,
    env: {
      PATH: pathFor("zoxide"),
    },
    ...options,
  };
  return useExec(`zoxide ${command}`, options);
};
