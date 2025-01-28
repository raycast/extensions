import { Action, ActionPanel, Icon, showToast, Toast, Keyboard, Clipboard } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import ObjectList from "./ObjectList";
import { Space } from "../helpers/schemas";

type SpaceActionsProps = {
  space: Space;
  mutate: MutatePromise<Space[]>;
};

export default function SpaceActions({ space, mutate }: SpaceActionsProps) {
  const spaceUrl = `anytype://main/object/_blank_/spaceId/${space.id}`;
  const chatUrl = `anytype://main/chat/${space.workspace_object_id}/spaceId/${space.id}`;

  async function handleCopyLink() {
    await Clipboard.copy(spaceUrl);
    await showToast({
      title: "Link copied",
      message: "The space link has been copied to your clipboard",
      style: Toast.Style.Success,
    });
  }

  async function handleRefresh() {
    await showToast({ style: Toast.Style.Animated, title: "Refreshing spaces" });
    if (mutate) {
      try {
        await mutate();
        await showToast({ style: Toast.Style.Success, title: "Spaces refreshed" });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to refresh spaces",
          message: error instanceof Error ? error.message : "An unknown error occurred.",
        });
      }
    }
  }

  return (
    <ActionPanel title={space.name}>
      <ActionPanel.Section>
        <Action.Push icon={Icon.List} title="View Objects" target={<ObjectList key={space.id} spaceId={space.id} />} />
        <Action.OpenInBrowser
          icon={{ source: "../assets/anytype-icon.png" }}
          title="Open Space in Anytype"
          url={spaceUrl}
        />
        <Action.OpenInBrowser
          icon={Icon.Bubble}
          title="Open Chat in Anytype"
          url={chatUrl}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      </ActionPanel.Section>

      <Action
        icon={Icon.Link}
        title="Copy Link"
        shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
        onAction={handleCopyLink}
      />
      <ActionPanel.Section>
        <Action
          icon={Icon.RotateClockwise}
          title="Refresh Spaces"
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={handleRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
