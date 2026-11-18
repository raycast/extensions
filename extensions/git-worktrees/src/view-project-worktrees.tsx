import { List } from "@raycast/api";
import { Worktree } from "./components/worktree";
import { useWorktrees } from "./hooks/use-worktrees";
import { EmptyWorktreeList } from "./view-worktrees";
import type { BareRepository } from "./config/types";

interface ViewProjectWorktreesProps {
  project: BareRepository;
}

export default function ViewProjectWorktrees({ project }: ViewProjectWorktreesProps) {
  const { worktrees, isLoadingWorktrees, revalidateWorktrees } = useWorktrees(project.fullPath);

  const navigationTitle = project.name ?? "Worktrees";

  if (worktrees.length === 0 && !isLoadingWorktrees) {
    return (
      <List navigationTitle={navigationTitle}>
        <EmptyWorktreeList
          title="No Worktrees Found"
          description="Add your first worktree to get started with this project"
          directory={project.fullPath}
          actions={{ addWorktree: true }}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoadingWorktrees} navigationTitle={navigationTitle}>
      <Worktree.List project={project} worktrees={worktrees} revalidateProjects={revalidateWorktrees} />
    </List>
  );
}
