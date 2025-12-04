import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { SpaceMembersView } from "../views/SpaceMembersView";
import { NewSpaceForm } from "../views/NewSpaceForm";
import { SpaceTagsView } from "../views/SpaceTagsView";
import { SpaceDetailView } from "../views/SpaceDetailView";

export const SpaceItemActionPanel = (props: {
  refetch: () => void;
  spaceId: string;
  // TODO: Use Prisma Type here
  type: "PERSONAL" | "TEAM";
}) => {
  const { spaceId, refetch, type } = props;

  return (
    <ActionPanel>
      <Action.Push
        title="Open Space Detail"
        icon={Icon.Info}
        target={<SpaceDetailView spaceId={spaceId} />}
        onPop={refetch}
      />
      <Action.Push
        title="Tags"
        icon={Icon.Tag}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        target={<SpaceTagsView spaceId={spaceId} />}
      />
      {type === "TEAM" && (
        <Action.Push
          title="Members"
          icon={Icon.TwoPeople}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          target={<SpaceMembersView spaceId={spaceId} />}
        />
      )}
      {/* TODO: Additional features planned */}
      {/* <Action title={"Copy Invitation Link"} onAction={() => console.log("Copy invitation link")} /> */}
      {/* <Action title={"Leave Space"} onAction={() => console.log("Leave Space")} /> */}
      {/* <Action title={"Delete Space"} onAction={() => console.log("Delete Space")} /> */}
      <ActionPanel.Section>
        <Action.Push
          title="Add New Space"
          icon={Icon.Plus}
          target={<NewSpaceForm />}
          shortcut={Keyboard.Shortcut.Common.New}
          onPop={refetch}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
