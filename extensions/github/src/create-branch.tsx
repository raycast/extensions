import {
  Action,
  ActionPanel,
  captureException,
  Clipboard,
  Color,
  Form,
  Image,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { useEffect } from "react";

import { getGitHubClient } from "./api/githubClient";
import { getErrorMessage } from "./helpers/errors";
import { getIssueStatus } from "./helpers/issue";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyRepositories } from "./hooks/useRepositories";

type BranchFormValues = {
  issue: string;
  name: string;
  repository: string;
  oid: string;
  repoUrl: string;
};

type BranchFormProps = {
  draftValues?: BranchFormValues;
};

export function BranchForm({ draftValues }: BranchFormProps) {
  const { github } = getGitHubClient();

  const { data: repositories, isLoading: repositoriesIsLoading } = useMyRepositories();

  const { handleSubmit, itemProps, values, setValue } = useForm<BranchFormValues>({
    onSubmit: async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating a branch" });

      try {
        let branchName: string | undefined;

        if (values.issue?.length) {
          const payload = { repositoryId: values.repository, issueId: values.issue, oid: values.oid };

          const createResult = await github.createLinkedBranch({
            input: values.name === "" ? payload : { ...payload, name: values.name },
          });

          branchName = createResult.createLinkedBranch?.linkedBranch?.ref?.name;
        } else if (values.name?.length) {
          const normalizedName = values.name.startsWith("refs/heads/") ? values.name : `refs/heads/${values.name}`;
          const createResult = await github.createRef({
            input: { repositoryId: values.repository, name: normalizedName, oid: values.oid },
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
            onAction: async () => await open(`${values.repoUrl}/tree/${branchName}`),
          };
        }
      } catch (error) {
        captureException(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed creating a branch";
        toast.message = getErrorMessage(error);
      }
    },
    initialValues: {
      repository: draftValues?.repository ?? "",
      issue: draftValues?.issue ?? "",
      name: draftValues?.name ?? "",
    },
    validation: {
      name: (val) => {
        if (!values.issue?.length && !val?.length) {
          return "Name is required when issue is not provided";
        }
      },
    },
  });

  const { data, isLoading: repositoryIsLoading } = useCachedPromise(
    async (repository) => {
      const selectedRepository = repositories?.find((r) => r.id === repository);

      if (!selectedRepository) {
        return undefined;
      }

      return await github.repositoryIssues({ owner: selectedRepository.owner.login, name: selectedRepository.name });
    },
    [values.repository],
    { execute: !!values.repository },
  );

  const issues = data?.repository?.issues?.nodes?.filter((node) => node?.linkedBranches.totalCount == 0);

  useEffect(() => {
    setValue("repoUrl", data?.repository?.url);
    setValue("oid", data?.repository?.defaultBranchRef?.target?.oid);
  }, [data?.repository?.url, data?.repository?.defaultBranchRef?.target?.oid]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={handleSubmit}
            title="Create Branch"
            icon={{ source: "branch.svg", tintColor: Color.PrimaryText }}
          />
        </ActionPanel>
      }
      enableDrafts
      isLoading={repositoriesIsLoading || repositoryIsLoading}
    >
      <Form.Dropdown
        title="Repository"
        isLoading={repositoriesIsLoading}
        {...itemProps.repository}
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
        title="Linked Issue"
        isLoading={repositoryIsLoading}
        {...itemProps.issue}
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
        title="Name"
        placeholder={
          values.issue ? "Optional branch name (ie: my new branch)" : "Branch name (ie: refs/heads/my_new_branch)"
        }
        {...itemProps.name}
      />
    </Form>
  );
}

export default withGitHubClient(BranchForm);
