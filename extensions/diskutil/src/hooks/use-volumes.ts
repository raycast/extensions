import { useExec } from "@raycast/utils";
import { parse } from "plist";
import { ListResult } from "@components/volumes";

export const useVolumes = (isScriptsLoading: boolean) => {
  const { isLoading: isLoadingVolumes, data: volumes } = useExec("/usr/sbin/diskutil", ["list", "-plist"], {
    failureToastOptions: { title: "Failed to list volumes" },
    parseOutput: (args) => {
      try {
        return parse(args.stdout) as ListResult;
      } catch {
        return {} as ListResult;
      }
    },
    execute: !isScriptsLoading,
  });

  return { isLoadingVolumes, volumes };
};
