import { Action, ActionPanel, confirmAlert, Icon } from "@raycast/api";
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
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<NewTagForm spaceId={spaceId} />}
        onPop={() => refetch()}
      />
      <Action
        title={"Remove Tag"}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
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
