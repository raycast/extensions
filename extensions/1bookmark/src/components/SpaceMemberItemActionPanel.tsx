import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { InviteSpaceMembersForm } from "../views/InviteSpaceMembersForm";
import { RouterOutputs } from "@repo/trpc-router";
import { trpc } from "../utils/trpc.util";

export const SpaceMemberItemActionPanel = (props: {
  myRole: RouterOutputs["user"]["listBySpaceId"][number]["role"];
  me: RouterOutputs["user"]["me"];
  spaceId: string;
  member: RouterOutputs["user"]["listBySpaceId"][number];
  refetch: () => void;
}) => {
  const { myRole, me, spaceId, member, refetch } = props;
  const removeUser = trpc.space.removeUser.useMutation();

  const handleRemove = async () => {
    const confirmed = await confirmAlert({
      title: "Remove User from This Space?",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    await removeUser.mutateAsync({ spaceId, targetEmail: member.email });
    refetch();
    showToast({
      style: Toast.Style.Success,
      title: "Removed",
    });
  };

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
       */}
      <Action.Push
        title={"Invite New Members"}
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<InviteSpaceMembersForm spaceId={spaceId} />}
      />
      {myRole === "OWNER" && me.email !== member.email && (
        <Action
          title={"Remove from This Space"}
          icon={Icon.Xmark}
          shortcut={Keyboard.Shortcut.Common.Remove}
          style={Action.Style.Destructive}
          onAction={handleRemove}
        />
      )}
    </ActionPanel>
  );
};
