import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getBranches } from "../adapter/git-command-adapter";
import { detectGitRepositories, GitRepositoryWithPath } from "../adapter/git-repository-detection-adapter";

export type ReviewParameters = {
  repository: GitRepositoryWithPath;
  currentBranch: string;
  targetBranch: string;
};

type Props = {
  readonly onSubmit: () => void;
};

export function ReviewSelectionForm({ onSubmit }: Props) {
  const [repositories, setRepositories] = useCachedState<GitRepositoryWithPath[]>("cached-git-repositories", []);
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [loadingRepositories, setLoadingRepositories] = useState<boolean>(true);
  const [reviewParameterState, setReviewParameterState] = useCachedState<ReviewParameters>("review-parameter-state", {
    repository: {
      repositoryPath: "",
      repositoryName: "",
    },
    currentBranch: "",
    targetBranch: "main",
  });

  useEffect(() => {
    async function fetchRepositories() {
      try {
        const detectedRepos = await detectGitRepositories();
        setRepositories(detectedRepos);
        setLoadingRepositories(false);
      } catch (error) {
        console.log(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error fetching local repositories",
          message: "Make sure Git repositories exist on your system.",
        });
      }
    }

    fetchRepositories();
  }, []);

  function triggerBranchDetectionForRepository(repositoryPath: string) {
    try {
      const branchList = getBranches(repositoryPath);
      setBranches(branchList);
    } catch (error) {
      console.log(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error fetching branches",
        message: "Make sure you are inside a Git repository.",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Submit"} onSubmit={onSubmit} />
        </ActionPanel>
      }
      isLoading={loadingRepositories}
    >
      <Form.Dropdown
        id={"repository"}
        title={"Repository to work on"}
        defaultValue={reviewParameterState?.repository?.repositoryName || ""}
        onChange={(newValue) => {
          const repository = repositories.find((repository) => {
            return repository.repositoryName === newValue;
          }) ?? { repositoryName: "", repositoryPath: "" };
          if (reviewParameterState) setReviewParameterState({ ...reviewParameterState, repository: repository });
          triggerBranchDetectionForRepository(repository.repositoryPath);
        }}
        isLoading={loadingRepositories}
      >
        {(repositories ?? []).map((repository) => (
          <Form.Dropdown.Item
            key={repository.repositoryPath}
            value={repository.repositoryName}
            title={repository.repositoryName}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id={"local-branch"}
        title={"Current branch"}
        info={"The branch where lies the code you want to be reviewed"}
        onChange={(newValue) => {
          if (reviewParameterState) setReviewParameterState({ ...reviewParameterState, currentBranch: newValue });
        }}
      >
        {(branches ?? []).map((branch) => (
          <Form.Dropdown.Item key={branch} value={branch} title={branch} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id={"target-branch"}
        title={"Target branch"}
        info={"The branch on which you reviewed code would be merged"}
        defaultValue={reviewParameterState?.targetBranch}
        onChange={(newValue) => {
          if (reviewParameterState) setReviewParameterState({ ...reviewParameterState, targetBranch: newValue });
        }}
      >
        {branches.map((branch) => (
          <Form.Dropdown.Item key={branch} value={branch} title={branch} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
