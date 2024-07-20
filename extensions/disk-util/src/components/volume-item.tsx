import { useExec } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  environment,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { spawn } from "node:child_process";
import { parse } from "plist";
import { sep } from "path";

type VolumeInfo = Partial<{
  VolumeUUID: string;
  VolumeName: string;
  FilesystemName: string;
  MountPoint: string;
  DeviceIdentifier: string;
  DeviceNode: string;
  CapacityInUse: number;
  TotalSize: number;
  FileVault: boolean;
}>;

export type VolumeListInfo = Pick<VolumeInfo, "MountPoint" | "VolumeUUID" | "VolumeName">;

export const VolumeItem = ({
  volume,
  deleted,
  setDeleted,
}: {
  volume: VolumeListInfo;
  deleted: string[];
  setDeleted: (deleted: string[]) => void;
}) => {
  const { data } = useExec("/usr/sbin/diskutil", ["info", "-plist", `${volume.VolumeName}`], {
    failureToastOptions: { title: `Failed to get info for volume: ${volume.VolumeName}` },
    parseOutput: (args) => {
      try {
        return parse(args.stdout) as VolumeInfo;
      } catch {
        return {} as VolumeInfo;
      }
    },
    keepPreviousData: true,
  });
  const sizeIcon = getSizeIcon(data?.CapacityInUse ?? 0, data?.TotalSize ?? 0);

  const deleteVolume = async () => {
    const { assetsPath, supportPath } = environment;
    const toast = await showToast(Toast.Style.Animated, `Deleting Volume '${volume.VolumeName}'`, "Please wait...");

    const bundleId = supportPath.split(sep).find((comp) => comp.startsWith("com.raycast")) ?? "com.raycast.macos";
    const askpassPath = `${assetsPath}/scripts/askpass`;
    const env = Object.assign({}, process.env, { SUDO_ASKPASS: askpassPath, RAYCAST_BUNDLE: bundleId });

    const child = spawn(
      "sudo -A",
      [`${assetsPath}/scripts/delete-volume`, `${volume.VolumeName}`, `${volume.VolumeUUID}`, `${!!data?.FileVault}`],
      { shell: true, env },
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
      title={volume.VolumeName!}
      subtitle={volume.MountPoint!}
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
          <Action.Push title="Show Details" icon={Icon.Eye} target={<VolumeDetails volume={volume} />} />
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

const VolumeDetails = ({ volume }: { volume: VolumeInfo }) => {
  const { data, isLoading } = useExec("/usr/sbin/diskutil", ["info", `${volume.VolumeName}`], {
    failureToastOptions: { title: `Failed to get info for volume: ${volume.VolumeName}` },
    keepPreviousData: true,
  });

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={volume.MountPoint}
      markdown={`### \`${volume.MountPoint}\` Information\n\`\`\`\n${data}\n\`\`\``}
      actions={
        <ActionPanel>
          <VolumeActions volume={volume} />
        </ActionPanel>
      }
    />
  );
};

export const VolumeActions = ({ volume }: { volume: VolumeInfo }) => {
  return (
    <>
      <Action.ShowInFinder path={volume.MountPoint!} />
      <ActionPanel.Section>
        <Action.CreateQuicklink
          title="Create Quicklink"
          icon={Icon.RaycastLogoPos}
          quicklink={{
            link: `file://${volume.MountPoint}`,
            name: `Volume ${volume.VolumeName}`,
            application: "Finder",
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
        />
        <Action.CopyToClipboard
          title="Copy Device Node"
          content={volume.DeviceNode ?? ""}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />
        <Action.CopyToClipboard
          title="Copy Mount Point"
          content={volume.MountPoint!}
          shortcut={{ modifiers: ["cmd", "shift"], key: "'" }}
        />
      </ActionPanel.Section>
    </>
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
