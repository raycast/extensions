import ViewWorktrees from "#/view-worktrees";
import { Action, Icon, useNavigation } from "@raycast/api";

export const ViewProjectWorktrees = ({ projectId, visitProject }: { projectId: string; visitProject?: () => void }) => {
  const { push } = useNavigation();

  return (
    <Action
      title="View Worktrees"
      icon={Icon.Tree}
      onAction={() => {
        visitProject?.();
        push(<ViewWorktrees projectId={projectId} />);
      }}
    />
  );
};
