import { Action, ActionPanel, Clipboard, Form, Image, showToast, Toast, open } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { useState } from "react";

import View from "./components/View";
import { getErrorMessage } from "./helpers/errors";
import { getIssueStatus } from "./helpers/issue";
import { getGitHubClient } from "./helpers/withGithubClient";
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
  const [searchText, setSearchText] = useState("");

  const { handleSubmit, itemProps, values } = useForm<BranchFormValues>({
    async onSubmit(values) {
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
    },
    initialValues: {
      repository: draftValues?.repository ?? "",
      issue: draftValues?.issue ?? "",
      name: draftValues?.name ?? "",
    },
    validation: {
      name: (value) => {
        if (!value && !values.issue) {
          return "This field can't be empty";
        }
      },
    },
  });

  const { data: repositories, isLoading: isLoadingRepositories } = useMyRepositories(searchText);
  const { data, isLoading: isLoadingRepositoryIssues } = useCachedPromise(
    (repository) => {
      const selectedRepository = repositories?.find((r) => r.id === repository);

      if (!selectedRepository) {
        return Promise.resolve(null);
      }

      return github.repositoryIssues({ owner: selectedRepository.owner.login, name: selectedRepository.name });
    },
    [values.repository],
    { execute: !!values.repository },
  );

  const issues = data?.repository?.issues?.nodes?.filter((node) => node?.linkedBranches.totalCount == 0);
  const oid = data?.repository?.defaultBranchRef?.target?.oid;
  const repositoryUrl = data?.repository?.url;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Branch" icon="branch.svg" />
        </ActionPanel>
      }
      enableDrafts
      isLoading={isLoadingRepositories || isLoadingRepositoryIssues}
    >
      <Form.Dropdown
        {...itemProps.repository}
        title="Repository"
        isLoading={isLoadingRepositories}
        storeValue
        onSearchTextChange={setSearchText}
        throttle
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
        {...itemProps.issue}
        title="Linked Issue"
        isLoading={isLoadingRepositoryIssues}
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
        {...itemProps.name}
        title="Name"
        placeholder={
          values.issue ? "Optional branch name (ie: my new branch)" : "Branch name (ie: refs/heads/my_new_branch)"
        }
      />
    </Form>
  );
}

export default function Command(props: { draftValues?: BranchFormValues }) {
  return (
    <View>
      <BranchForm draftValues={props.draftValues} />
    </View>
  );
}
