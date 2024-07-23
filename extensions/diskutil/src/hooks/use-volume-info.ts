import { useExec } from "@raycast/utils";
import { parse } from "plist";
import { VolumeInfo } from "@components/volumes";

export const useVolumeInfo = (name: string) => {
  const { data: volume, isLoading: isLoadingVolumeInfo } = useExec(
    "/usr/sbin/diskutil",
    ["info", "-plist", `${name}`],
    {
      failureToastOptions: { title: `Failed to get info for volume: ${name}` },
      parseOutput: (args) => {
        try {
          return parse(args.stdout) as VolumeInfo;
        } catch {
          return {} as VolumeInfo;
        }
      },
      keepPreviousData: true,
    },
  );

  return { volume, isLoadingVolumeInfo };
};

export const useVolumeInfoMarkdown = (name: string) => {
  const { data: markdown, isLoading: isLoadingMarkdown } = useExec("/usr/sbin/diskutil", ["info", `${name}`], {
    failureToastOptions: { title: `Failed to get info for volume: ${name}` },
    keepPreviousData: true,
  });

  return { markdown, isLoadingMarkdown };
};
