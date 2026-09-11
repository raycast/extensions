import { Action, ActionPanel, Alert, Icon, confirmAlert, Keyboard } from "@raycast/api";
import { errorMessage, runContainerMutation } from "../lib/container";
import { withToast } from "../lib/toast";
import type { VolumeVM } from "../lib/types";
import { CreateVolumeForm } from "./CreateVolumeForm";

interface Props {
  volume: VolumeVM;
  revalidate: () => void;
  onRemoved?: () => void;
}

/** Shared actions for a volume, used by both the list row and the detail view. */
export function VolumeActions({ volume, revalidate, onRemoved }: Props) {
  const deleteVolume = async () => {
    const confirmed = await confirmAlert({
      title: `Delete volume ${volume.name}?`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    const ok = await withToast({
      action: () => runContainerMutation(["volume", "delete", volume.name]),
      onStart: "Deleting…",
      onSuccess: "Volume deleted",
      onFailure: (error) => ({ title: "Delete failed", message: errorMessage(error) }),
    })();
    revalidate();
    if (ok) {
      onRemoved?.();
    }
  };

  return (
    <>
      <ActionPanel.Section>
        <Action.Push
          title="Create Volume…"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<CreateVolumeForm onCreated={revalidate} />}
        />
        <Action
          title="Delete Volume"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={deleteVolume}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Name" content={volume.name} />
        {volume.source ? <Action.CopyToClipboard title="Copy Source Path" content={volume.source} /> : null}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
      </ActionPanel.Section>
    </>
  );
}
