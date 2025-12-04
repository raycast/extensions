import { Action, ActionPanel, confirmAlert, Icon, Keyboard } from "@raycast/api";
import { NewTagForm } from "../views/NewTagForm";
import { trpc } from "../utils/trpc.util";

export const SpaceTagItemActionPanel = (props: { spaceId: string; tagName: string; refetch: () => void }) => {
  const { spaceId, tagName, refetch } = props;

  const deleteTag = trpc.tag.delete.useMutation();

  return (
    <ActionPanel>
      <Action.Push
        title={"Create New Tag"}
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<NewTagForm spaceId={spaceId} />}
        onPop={() => refetch()}
      />
      <Action
        title={"Remove Tag"}
        shortcut={Keyboard.Shortcut.Common.Remove}
        style={Action.Style.Destructive}
        icon={Icon.Trash}
        onAction={async () => {
          const confirm = await confirmAlert({
            title: "Remove Tag",
            message: "Are you sure you want to remove this tag?",
          });
          if (!confirm) return;

          deleteTag.mutateAsync(
            {
              spaceId,
              tagName,
            },
            {
              onSuccess: refetch,
            },
          );
        }}
      />
    </ActionPanel>
  );
};
