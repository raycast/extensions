import { useExec } from "@raycast/utils";

export function useExecPlus(command: UseExecArgs[0], options?: UseExecArgs[2]) {
  return useExec(command, {
    shell: "bash",
    ...options,
  });
}

type UseExecArgs = Parameters<typeof useExec<string>>;
