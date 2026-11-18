import {
  ActionPanel,
  Action,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
  Alert,
  popToRoot,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useMemo, useCallback } from "react";
import useRemoteConfig from "../hooks/useRemoteConfig";
import useConfigDump from "../hooks/useConfigDump";
import EditRemoteForm from "./EditRemoteForm";
import rclone from "../lib/rclone";
import useRemoteMountPoints from "../hooks/useRemoteMountPoints";

export default function RemoteDetail({ remote, onUpdate }: { remote: string; onUpdate?: () => void }) {
  const { data: remoteConfig, isLoading: isRemoteLoading, error: remoteError } = useRemoteConfig(remote);

  const { data: dumpData, isLoading: isDumpLoading, error: dumpError } = useConfigDump();

  const { data: mountPoints, isLoading: isMountsLoading, revalidate: revalidateMounts } = useRemoteMountPoints(remote);

  const remoteEntries = useMemo(() => {
    if (!dumpData || typeof dumpData !== "object") {
      return [];
    }
    const remoteDetails = dumpData[remote];
    if (!remoteDetails) {
      return [];
    }
    return Object.entries(remoteDetails).filter(([key]) => key !== "type");
  }, [dumpData, remote]);

  const mountPointEntries = mountPoints ?? [];
  const isError = !isRemoteLoading && (!remoteConfig || remoteError);

  const handleUnmount = useCallback(
    async (mountPoint: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Unmounting..." });

      try {
        await rclone("/mount/unmount", {
          params: {
            query: {
              mountPoint,
            },
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Unmounted";
        toast.message = mountPoint;
        revalidateMounts();
      } catch (unmountError) {
        const message = unmountError instanceof Error ? unmountError.message : "Unknown error";
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to unmount";
        toast.message = message;
      }
    },
    [revalidateMounts],
  );

  return (
    <List
      navigationTitle={`${remote} Options`}
      isShowingDetail
      isLoading={isRemoteLoading || isDumpLoading || isMountsLoading}
    >
      {isError ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load remote"
          description={remoteError?.message ?? "Unknown error"}
        />
      ) : dumpError ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load config"
          description={dumpError?.message ?? "Unknown error"}
        />
      ) : (
        <>
          <List.Section title="Details">
            <List.Item
              title={remote}
              icon={Icon.Info}
              detail={
                <List.Item.Detail
                  markdown={`### ${remote}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Type" text={remoteConfig?.type ?? "Unknown"} />
                      {remoteEntries.length > 0 ? (
                        remoteEntries.map(([key, value]) => (
                          <List.Item.Detail.Metadata.Label
                            key={key}
                            title={key}
                            text={value !== undefined ? String(value) : ""}
                          />
                        ))
                      ) : (
                        <List.Item.Detail.Metadata.Label title="Config" text="No additional fields" />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          </List.Section>
          <List.Section title="Actions">
            <List.Item
              title="Edit Remote"
              icon={Icon.Pencil}
              detail={<List.Item.Detail markdown={`Edit settings for **${remote}**`} />}
              actions={
                <ActionPanel>
                  <Action.Push title="Edit Remote" icon={Icon.Pencil} target={<EditRemoteForm remote={remote} />} />
                </ActionPanel>
              }
            />
            <List.Item
              title="Run Operation"
              icon={Icon.Play}
              detail={<List.Item.Detail markdown="Open the operations catalog to run an action." />}
              actions={
                <ActionPanel>
                  <Action
                    title="Run Operation"
                    icon={Icon.Play}
                    onAction={async () => {
                      await launchCommand({
                        name: "run-operation",
                        type: LaunchType.UserInitiated,
                        context: { remote },
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Remove Remote"
              icon={Icon.Trash}
              detail={<List.Item.Detail markdown={`Remove **${remote}** from the config`} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove Remote"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleRemoveRemote(remote, onUpdate)}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          {mountPointEntries.length > 0 && (
            <List.Section title="Mount Points">
              {mountPointEntries.map((mountPoint) => (
                <List.Item
                  key={mountPoint.MountPoint}
                  title={mountPoint.MountPoint}
                  icon={Icon.HardDrive}
                  accessories={[{ tag: mountPoint.Fs }]}
                  detail={
                    <List.Item.Detail
                      markdown={`### ${mountPoint.MountPoint}\nMounted from \`${mountPoint.Fs}\``}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Source" text={mountPoint.Fs} />
                          <List.Item.Detail.Metadata.Label
                            title="Mounted On"
                            text={new Date(mountPoint.MountedOn).toLocaleString()}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Unmount"
                        icon={Icon.Eject}
                        style={Action.Style.Destructive}
                        onAction={() => {
                          void handleUnmount(mountPoint.MountPoint);
                        }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

async function handleRemoveRemote(remote: string, onUpdate?: () => void) {
  const confirmed = await confirmAlert({
    title: `Remove ${remote}?`,
    message: "This action cannot be undone.",
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  try {
    await rclone("/config/delete", {
      params: {
        query: {
          name: remote,
        },
      },
    });
    await showToast({ style: Toast.Style.Success, title: `${remote} removed` });
    onUpdate?.();

    await popToRoot();
    await popToRoot();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({ style: Toast.Style.Failure, title: "Failed to remove remote", message });
  }
}
