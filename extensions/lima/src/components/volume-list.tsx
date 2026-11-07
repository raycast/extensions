import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { size } from "../lib/instance";
import { deleteDisk } from "../lib/lima";
import { listVolumes, Volume, volumeStatus } from "../lib/volumes";
import { ErrorView } from "./error-view";
import { ExtensionActions } from "./extension-actions";
import { capPath } from "./instance-detail";

const STATUS_ORDER = ["In Use", "Attached", "Not Attached"];
const STATUS_COLORS: Record<string, Color> = {
  "In Use": Color.Green,
  Attached: Color.Blue,
  "Not Attached": Color.SecondaryText,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The Lima disks there are, used or not: storage that outlives instances, so deleting an instance leaves them. */
export function VolumeList() {
  const {
    data: volumes,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(listVolumes, [], {
    onError(error) {
      if (volumes?.length)
        showToast({ style: Toast.Style.Failure, title: "Couldn't load volumes", message: error.message });
    },
  });

  const [busy, setBusy] = useState(false);

  async function remove(volume: Volume) {
    const users = volume.attachedTo.join(" and ");
    const confirmed = await confirmAlert({
      title: `Delete ${volume.name}?`,
      message: volume.attachedTo.length
        ? `${users} ${volume.attachedTo.length === 1 ? "is" : "are"} set up to use it and won't start without it: take it out of their lima.yaml first. Everything on it is deleted. This can't be undone.`
        : "Everything on it is deleted. This can't be undone.",
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${volume.name}...` });
    try {
      await deleteDisk(volume.name);
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${volume.name}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Couldn't delete ${volume.name}`;
      toast.message = errorMessage(error);
    } finally {
      setBusy(false);
      revalidate();
    }
  }

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: (volumes ?? []).filter((volume) => volumeStatus(volume) === status),
  })).filter((group) => group.items.length);

  return (
    <List
      isLoading={isLoading || busy}
      isShowingDetail={(volumes?.length ?? 0) > 0}
      navigationTitle={volumes ? `${volumes.length} ${volumes.length === 1 ? "Volume" : "Volumes"}` : undefined}
      searchBarPlaceholder="Search by name or instance"
    >
      {error && !volumes ? (
        <ErrorView error={error} title="Couldn't Load Volumes" onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="No Volumes"
          description="A volume is a Lima disk that outlives instances, like a Docker volume. limactl disk create makes one."
          actions={
            <ActionPanel>
              {refreshAction}
              <ExtensionActions />
            </ActionPanel>
          }
        />
      )}
      {grouped.map(({ status, items }) => (
        <List.Section key={status} title={status} subtitle={String(items.length)}>
          {items.map((volume) => (
            <List.Item
              key={volume.name}
              id={volume.name}
              icon={{ source: Icon.HardDrive, tintColor: STATUS_COLORS[status] }}
              title={volume.name}
              keywords={volume.attachedTo}
              accessories={[
                {
                  text: `${size(volume.used)} of ${size(volume.size)}`,
                  tooltip: `Takes ${size(volume.used)} on this Mac, holds up to ${size(volume.size)}`,
                },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Volume" text={volume.name} />
                      <List.Item.Detail.Metadata.TagList title="Status">
                        <List.Item.Detail.Metadata.TagList.Item text={status} color={STATUS_COLORS[status]} />
                      </List.Item.Detail.Metadata.TagList>
                      {volume.instance && <List.Item.Detail.Metadata.Label title="In Use By" text={volume.instance} />}
                      {volume.attachedTo.length ? (
                        volume.attachedTo.map((name, index) => (
                          <List.Item.Detail.Metadata.Label
                            key={name}
                            title={index === 0 ? "Attached To" : ""}
                            text={name}
                          />
                        ))
                      ) : (
                        <List.Item.Detail.Metadata.Label title="Attached To" text="No instance" />
                      )}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Size" text={size(volume.size)} />
                      <List.Item.Detail.Metadata.Label title="On This Mac" text={size(volume.used)} />
                      <List.Item.Detail.Metadata.Label title="Format" text={volume.format} />
                      <List.Item.Detail.Metadata.Label title="In the VM" text={volume.mountPoint} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Folder" text={capPath(volume.dir)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel title={volume.name}>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy Name" content={volume.name} />
                    <Action.ShowInFinder path={volume.dir} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                    {refreshAction}
                  </ActionPanel.Section>
                  {/* A running instance holds it: limactl refuses until that instance stops. */}
                  {!volume.instance && (
                    <ActionPanel.Section>
                      <Action
                        title="Delete Volume"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => remove(volume)}
                      />
                    </ActionPanel.Section>
                  )}
                  <ExtensionActions />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
