import { useExec } from "@raycast/utils";

export const useZoxide = (command: string, options?: object) => {
  options = {
    shell: true,
    env: {
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
    },
    ...options,
  };
  return useExec(`zoxide ${command}`, options);
};
