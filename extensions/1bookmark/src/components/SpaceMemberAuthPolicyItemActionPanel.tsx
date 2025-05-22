import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { RouterOutputs, trpc } from "../utils/trpc.util";
import { NewSpaceMemberAuthPolicyForm } from "../views/NewSpaceMemberAuthPolicyForm";

export const SpaceMemberAuthPolicyItemActionPanel = (props: {
  refetch: () => void;
  spaceId: string;
  emailPattern: string;
  me: RouterOutputs["user"]["me"];
}) => {
  const { spaceId, refetch, emailPattern, me } = props;

  const space = me.associatedSpaces.find((space) => space.id === spaceId);
  const deletePolicy = trpc.spaceAuth.deleteMemberAuthPolicy.useMutation();

  const handleDelete = async (emailPattern: string) => {
    if (space?.myRole !== "OWNER") {
      showToast({
        style: Toast.Style.Failure,
        title: "You are not an owner of this space",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete Member Auth Policy",
      message: `Are you sure you want to delete the member auth policy for ${emailPattern}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    deletePolicy.mutate(
      { spaceId, emailPattern },
      {
        onSuccess: () => {
          refetch();
        },
      },
    );
  };

  return (
    <ActionPanel>
      {space?.myRole === "OWNER" && (
        <Action
          title="Delete Member Auth Policy"
          shortcut={Keyboard.Shortcut.Common.Remove}
          icon={Icon.Trash}
          onAction={() => handleDelete(emailPattern)}
        />
      )}
      <ActionPanel.Section>
        <Action.Push
          title="Create New Member Auth Policy"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<NewSpaceMemberAuthPolicyForm spaceId={spaceId} />}
          onPop={() => refetch()}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
