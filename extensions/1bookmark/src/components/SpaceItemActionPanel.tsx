import { RouterOutputs } from "@/utils/trpc.util";
import { Action, ActionPanel } from "@raycast/api";
import { SpaceMembersView } from "../views/SpaceMembersView";
import { NewSpaceForm } from "../views/NewSpaceForm";
import { SpaceTagsView } from "../views/SpaceTagsView";

export const SpaceItemActionPanel = (props: {
  me: RouterOutputs["user"]["me"] | undefined;
  refetch: () => void;
  spaceId: string;
}) => {
  const { spaceId, refetch } = props;

  return (
    <ActionPanel>
      <Action
        title="Open Team Detail"
        onAction={() => {
          console.log("Open Team Detail");
        }}
      />
      <Action.Push
        title={"Members"}
        shortcut={{ modifiers: ["cmd"], key: "m" }}
        target={<SpaceMembersView spaceId={spaceId} />}
      />
      <Action.Push
        title={"Tags"}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        target={<SpaceTagsView spaceId={spaceId} />}
      />
      <Action title={"Copy Invitation Link"} onAction={() => console.log("Copy invitation link")} />
      <Action title={"Leave Team"} onAction={() => console.log("Leave Team")} />
      <Action title={"Delete Team"} onAction={() => console.log("Delete team")} />
      <ActionPanel.Section>
        <Action.Push
          title={"Add New Team"}
          target={<NewSpaceForm />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onPop={refetch}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
