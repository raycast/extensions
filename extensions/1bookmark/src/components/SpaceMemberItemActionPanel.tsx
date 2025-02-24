import { Action, ActionPanel, Icon } from "@raycast/api";
import { InviteSpaceMembersForm } from "../views/InviteSpaceMembersForm";

export const SpaceMemberItemActionPanel = (props: { spaceId: string }) => {
  const { spaceId } = props;

  return (
    <ActionPanel>
      {/* TODO: Additional features planned */}
      {/* <Action
        title={"Show Detail"}
        icon={Icon.Info}
        onAction={() => {
          console.log("Show Detail");
        }}
      />
      <Action
        title={"Promote"}
        icon={Icon.Person}
        onAction={() => {
          console.log("Promote");
        }}
      />
      <Action
        title={"Remove from This Space"}
        icon={Icon.Xmark}
        onAction={() => {
          console.log("Promote");
        }}
      /> */}
      <ActionPanel.Section>
        <Action.Push
          title={"Invite New Members"}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<InviteSpaceMembersForm spaceId={spaceId} />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
