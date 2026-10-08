import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { spawn } from "node:child_process";
import { VolumeListInfo } from "@components/volumes";
import { useVolumeInfo } from "@hooks/use-volume-info";
import { VolumeDetails } from "@components/volume-details";
import { VolumeActions } from "@components/volume-actions";
import { assetsPath, env } from "@utils/env";

export const VolumeItem = ({
  volume,
  deleted,
  setDeleted,
}: {
  volume: VolumeListInfo;
  deleted: string[];
  setDeleted: (deleted: string[]) => void;
}) => {
  const { volume: data } = useVolumeInfo(volume.VolumeName!);
  const sizeIcon = getSizeIcon(data?.CapacityInUse ?? 0, data?.TotalSize ?? 0);

  const deleteVolume = async () => {
    const toast = await showToast(Toast.Style.Animated, `Deleting Volume '${volume.VolumeName}'`, "Please wait...");

    const child = data?.FileVault
      ? spawn(
          "sudo -A",
          [
            `${assetsPath}/scripts/delete-volume`,
            `${volume.VolumeName}`,
            `${volume.VolumeUUID}`,
            `${!!data?.FileVault}`,
          ],
          { shell: true, env },
        )
      : spawn(
          `${assetsPath}/scripts/delete-volume`,
          [`${volume.VolumeName}`, `${volume.VolumeUUID}`, `${!!data?.FileVault}`],
          { shell: true },
        );

    child.stdout.on("data", async (msg) => {
      toast.message = msg;
      if (msg.includes("success")) {
        toast.style = Toast.Style.Success;
        toast.title = `Successfully deleted volume '${volume.VolumeName}'.`;
        setDeleted([...deleted, volume.VolumeUUID!]);
      }
    });

    child.stderr.on("data", async (msg) => {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete volume";
      toast.message = msg;
    });
  };

  return (
    <List.Item
      key={volume.VolumeUUID}
      title={volume.MountPoint!}
      icon={{ source: Icon.HardDrive, tintColor: Color.Purple }}
      accessories={
        !data
          ? []
          : [
              ...(`${data.FilesystemName}`.includes("Case-sensitive")
                ? [{ icon: { source: Icon.Lowercase, tintColor: Color.Magenta }, tooltip: "Case-sensitive" }]
                : []),
              {
                icon: data.FileVault
                  ? { source: Icon.Lock, tintColor: Color.Blue }
                  : { source: Icon.LockDisabled, tintColor: Color.Red },
                tooltip: data.FileVault ? "FileVault Encrypted" : "Not Encrypted in FileVault",
              },
              ...(data.DeviceIdentifier && data.DeviceNode
                ? [
                    {
                      icon: { source: Icon.MemoryChip, tintColor: Color.Yellow },
                      tooltip: `Device: ${data.DeviceNode}`,
                      text: { value: data.DeviceIdentifier, color: Color.Yellow },
                    },
                  ]
                : []),
              ...(data.CapacityInUse && data.TotalSize
                ? [
                    {
                      icon: sizeIcon,
                      text: {
                        value: `${formatBytes(data.CapacityInUse)} / ${formatBytes(data.TotalSize)}`,
                        color: sizeIcon.tintColor,
                      },
                      tooltip: `Used: ${Math.ceil((data.CapacityInUse / data.TotalSize) * 100)}%`,
                    },
                  ]
                : []),
            ]
      }
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.Eye} target={<VolumeDetails name={volume.VolumeName!} />} />
          {data && <VolumeActions volume={data} />}
          <ActionPanel.Section>
            <Action
              title="Delete Volume"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() =>
                confirmAlert({
                  title: `Delete Volume '${volume.VolumeName}'?`,
                  message: "Are you sure you want to delete this volume?",
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive, onAction: deleteVolume },
                })
              }
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

const getSizeIcon = (size: number, total: number) => {
  const percent = Math.ceil((size / total) * 100);

  if (percent < 25) {
    return { source: Icon.StackedBars1, tintColor: Color.Green };
  } else if (percent < 50) {
    return { source: Icon.StackedBars2, tintColor: Color.Yellow };
  } else if (percent < 75) {
    return { source: Icon.StackedBars3, tintColor: Color.Orange };
  } else {
    return { source: Icon.StackedBars4, tintColor: Color.Red };
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1000;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const formattedBytes = (bytes / Math.pow(k, i)).toFixed(2);

  return `${formattedBytes} ${sizes[i]}`;
};
