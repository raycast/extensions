import { Action, ActionPanel, Alert, Icon, confirmAlert, Keyboard } from "@raycast/api";
import { errorMessage, runContainerMutation } from "../lib/container";
import { withToast } from "../lib/toast";
import type { ImageVM } from "../lib/types";
import { PullImageForm } from "./PullImageForm";
import { RunContainerForm } from "./RunContainerForm";
import { TagImageForm } from "./TagImageForm";

interface Props {
  image: ImageVM;
  revalidate: () => void;
  onRemoved?: () => void;
}

/** Shared actions for an image, used by both the list row and the detail view. */
export function ImageActions({ image, revalidate, onRemoved }: Props) {
  const confirmThenRun = async (
    title: string,
    actionLabel: string,
    args: string[],
    messages: { start: string; ok: string },
    removed = false,
  ) => {
    const confirmed = await confirmAlert({
      title,
      icon: Icon.Trash,
      primaryAction: { title: actionLabel, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    const ok = await withToast({
      action: () => runContainerMutation(args),
      onStart: messages.start,
      onSuccess: messages.ok,
      onFailure: (error) => ({ title: "Action failed", message: errorMessage(error) }),
    })();
    revalidate();
    if (removed && ok) {
      onRemoved?.();
    }
  };

  return (
    <>
      <ActionPanel.Section>
        <Action.Push
          title="Run Container…"
          icon={Icon.Play}
          target={<RunContainerForm image={image.name} onStarted={revalidate} />}
        />
        <Action.Push
          title="Pull Image…"
          icon={Icon.Download}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<PullImageForm onPulled={revalidate} />}
        />
        <Action.Push
          title="Tag Image…"
          icon={Icon.Tag}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          target={<TagImageForm source={image.name} onTagged={revalidate} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Delete Image"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() =>
            confirmThenRun(
              `Delete image ${image.nameShort}?`,
              "Delete",
              ["image", "delete", image.name],
              { start: "Deleting…", ok: "Image deleted" },
              true,
            )
          }
        />
        <Action
          title="Prune Unused Images"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          onAction={() =>
            confirmThenRun("Prune all unused images?", "Prune", ["image", "prune"], {
              start: "Pruning…",
              ok: "Unused images pruned",
            })
          }
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Reference" content={image.name} />
        <Action.CopyToClipboard title="Copy Digest" content={image.digest} />
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
