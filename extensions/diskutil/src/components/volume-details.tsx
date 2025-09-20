import { useVolumeInfo, useVolumeInfoMarkdown } from "@hooks/use-volume-info";
import { ActionPanel, Detail } from "@raycast/api";
import { VolumeActions } from "@components/volume-actions";

export const VolumeDetails = ({ name }: { name: string }) => {
  const { volume, isLoadingVolumeInfo } = useVolumeInfo(name);
  const { markdown, isLoadingMarkdown } = useVolumeInfoMarkdown(name);

  return (
    <Detail
      markdown={`### \`${volume?.MountPoint}\` Information\n\`\`\`\n${markdown}\n\`\`\``}
      isLoading={isLoadingMarkdown || isLoadingVolumeInfo}
      navigationTitle={volume?.MountPoint}
      actions={
        <ActionPanel>
          <VolumeActions volume={volume} />
        </ActionPanel>
      }
    />
  );
};
