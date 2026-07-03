import { useCachedPromise } from "@raycast/utils";
import { Repo, getCurrentBranch, getLocalBranches, getRemoteOwnerRepo } from "../lib/git";
import { WorkflowFile } from "../lib/workflows";
import RunWorkflowForm from "../views/RunWorkflowForm";

/**
 * Resolves the data needed to dispatch a `workflow_dispatch` workflow for a repo (owner/repo, local
 * branches, current branch) and exposes `getRunWorkflowTarget`, which builds the same `RunWorkflowForm`
 * element used by the "Run Workflow" command, prefilled with a branch, for use with `<Action.Push
 * target={...} />` to review/confirm before dispatching. Shared by `RunWorkflowView` (picking a workflow
 * from scratch) and `RepoRunsList` (re-running the workflow behind a specific past run).
 */
export function useRunWorkflow(repo: Repo) {
  const { data: ownerRepo } = useCachedPromise(async (repoPath: string) => getRemoteOwnerRepo(repoPath), [repo.path]);

  const { data, isLoading } = useCachedPromise(
    async (repoPath: string) => {
      const [branches, currentBranch] = await Promise.all([getLocalBranches(repoPath), getCurrentBranch(repoPath)]);
      return { branches, currentBranch };
    },
    [repo.path],
  );

  const branches = data?.branches ?? [];
  const currentBranch = data?.currentBranch;

  /** Builds the `RunWorkflowForm` element (the same view the "Run Workflow" command uses) to review/confirm before dispatching `workflow`. */
  function getRunWorkflowTarget(workflow: WorkflowFile, defaultBranch?: string) {
    const branch = defaultBranch ?? currentBranch ?? branches[0];

    return (
      <RunWorkflowForm
        repo={repo}
        workflow={workflow}
        branch={branch}
        branches={branches}
        currentBranch={currentBranch}
      />
    );
  }

  return { ownerRepo, branches, currentBranch, isLoading, getRunWorkflowTarget };
}
