import { useExec } from "@raycast/utils";
import { parse } from "plist";
import { ListResult } from "@components/volumes";
import { captureException } from "@raycast/api";

export const useVolumes = (isScriptsLoading: boolean) => {
  const { isLoading: isLoadingVolumes, data: volumes } = useExec("/usr/sbin/diskutil", ["list", "-plist"], {
    failureToastOptions: { title: "Failed to list volumes" },
    parseOutput: (args) => {
      try {
        return parse(args.stdout) as ListResult;
      } catch (err) {
        captureException(err);
        return {} as ListResult;
      }
    },
    execute: !isScriptsLoading,
  });

  return { isLoadingVolumes, volumes };
};
