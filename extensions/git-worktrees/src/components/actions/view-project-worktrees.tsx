import type { BareRepository } from "#/config/types";
import ViewProjectWorktrees from "#/view-project-worktrees";
import { Action, Icon, useNavigation } from "@raycast/api";

export const ViewProjectWorktreesAction = ({
  project,
  visitProject,
}: {
  project: BareRepository;
  visitProject?: () => void;
}) => {
  const { push } = useNavigation();

  return (
    <Action
      title="View Worktrees"
      icon={Icon.Tree}
      onAction={() => {
        visitProject?.();
        push(<ViewProjectWorktrees project={project} />);
      }}
    />
  );
};
