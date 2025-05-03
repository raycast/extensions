import { useExec } from "@raycast/utils";

export const useZoxide = (command: string, options?: object): ReturnType<typeof useExec> => {
  options = {
    shell: true,
    env: {
      PATH: "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/opt/homebrew/sbin",
    },
    ...options,
  };
  return useExec(`zoxide ${command}`, options);
};
