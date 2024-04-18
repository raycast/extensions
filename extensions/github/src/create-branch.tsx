import { Action, ActionPanel, Clipboard, Color, Form, Image, Toast, open, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import { getErrorMessage } from "./helpers/errors";
import { getIssueStatus } from "./helpers/issue";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyRepositories } from "./hooks/useRepositories";

type BranchFormValues = {
  issue?: string;
  name?: string;
  repository: string;
};

type BranchFormProps = {
  draftValues?: BranchFormValues;
};

export function BranchForm({ draftValues }: BranchFormProps) {
  const { github } = getGitHubClient();

  const [repositoryId, setRepositoryId] = useState<string>(draftValues?.repository ?? "");
  const [issue, setIssue] = useState<string>(draftValues?.issue ?? "");
  const [name, setName] = useState<string>(draftValues?.name ?? "");
  const [nameError, setNameError] = useState<string | undefined>();

  const { data: repositories, isLoading: repositoriesIsLoading } = useMyRepositories();
  const { data, isLoading: repositoryIsLoading } = useCachedPromise(
    (repository) => {
      const selectedRepository = repositories?.find((r) => r.id === repository);

      if (!selectedRepository) {
        return Promise.resolve(null);
      }

      return github.repositoryIssues({ owner: selectedRepository.owner.login, name: selectedRepository.name });
    },
    [repositoryId],
    { execute: !!repositoryId },
  );

  const issues = data?.repository?.issues?.nodes?.filter((node) => node?.linkedBranches.totalCount == 0);
  const oid: string = data?.repository?.defaultBranchRef?.target?.oid;
  const repositoryUrl: string = data?.repository?.url;

  async function onSubmit(values: BranchFormValues) {
    if (values.name?.length == 0 && values.issue?.length == 0) {
      return setNameError("This field can't be empty!");
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating a branch" });

    try {
      let branchName: string | undefined;

      if (values.issue?.length) {
        const payload = { repositoryId: values.repository, issueId: values.issue, oid };

        const createResult = await github.createLinkedBranch({
          input: values.name === "" ? payload : { ...payload, name: values.name },
        });

        branchName = createResult.createLinkedBranch?.linkedBranch?.ref?.name;
      } else if (values.name) {
        const createResult = await github.createRef({
          input: { repositoryId: values.repository, name: values.name, oid },
        });
        branchName = createResult.createRef?.ref?.name;
      }

      toast.style = Toast.Style.Success;
      toast.title = `${branchName} is created`;

      if (branchName) {
        toast.primaryAction = {
          title: "Copy Branch Name",
          shortcut: { modifiers: ["shift", "cmd"], key: "c" },
          onAction: () => branchName && Clipboard.copy(branchName),
        };
        toast.secondaryAction = {
          title: "Open in Browser",
          shortcut: { modifiers: ["shift", "cmd"], key: "o" },
          onAction: async () => await open(`${repositoryUrl}/tree/${branchName}`),
        };
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed creating a branch";
      toast.message = getErrorMessage(error);
    }
  }

  useEffect(() => {
    if ((!!name.length && !!nameError?.length) || issue?.length) {
      setNameError(undefined);
    }
    setName(name);
  }, [issue]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={onSubmit}
            title="Create Branch"
            icon={{ source: "branch.svg", tintColor: Color.PrimaryText }}
          />
        </ActionPanel>
      }
      enableDrafts
      isLoading={repositoriesIsLoading || repositoryIsLoading}
    >
      <Form.Dropdown
        id="repository"
        title="Repository"
        isLoading={repositoriesIsLoading}
        value={repositoryId}
        onChange={setRepositoryId}
        autoFocus
        storeValue
      >
        {repositories?.map((repository) => (
          <Form.Dropdown.Item
            key={repository.id}
            title={repository.nameWithOwner}
            value={repository.id}
            icon={{ source: repository.owner.avatarUrl, mask: Image.Mask.Circle }}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown
        id="issue"
        title="Linked Issue"
        isLoading={repositoryIsLoading}
        value={issue}
        onChange={setIssue}
        info="If you don't select an issue, a ref pointing to the last commit of the selected repository will be created instead of an issue branch"
      >
        <Form.Dropdown.Item key={"default"} title={"No issue"} value={""} />
        {issues?.map((issue) =>
          issue ? (
            <Form.Dropdown.Item
              key={issue?.id}
              title={`#${issue.number} ${issue.title}`}
              value={issue.id}
              {...getIssueStatus(issue)}
            />
          ) : null,
        )}
      </Form.Dropdown>

      <Form.TextField
        id="name"
        title="Name"
        placeholder={issue ? "Optional branch name (ie: my new branch)" : "Branch name (ie: refs/heads/my_new_branch)"}
        value={name}
        error={nameError}
        onChange={(newName) => {
          if (!!newName.length && !!nameError?.length) {
            setNameError(undefined);
          }
          setName(newName);
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0 && issue.length == 0) {
            setNameError("This field can't be empty!");
          } else {
            setNameError(undefined);
          }
        }}
      />
    </Form>
  );
}

export default withGitHubClient(BranchForm);
