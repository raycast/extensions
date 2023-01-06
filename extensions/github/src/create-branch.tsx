import { Action, ActionPanel, Clipboard, Form, Image, showToast, Toast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";

import View from "./components/View";
import { getErrorMessage } from "./helpers/errors";
import { getIssueStatus } from "./helpers/issue";
import { getGitHubClient } from "./helpers/withGithubClient";
import { useMyRepositories } from "./hooks/useRepositories";

type BranchFormValues = {
  issue: string;
  name?: string;
  repository: string;
  oid: string;
};

type BranchFormProps = {
  draftValues?: BranchFormValues;
};

export function BranchForm({ draftValues }: BranchFormProps) {
  const { github } = getGitHubClient();
  const { data: repositories, isLoading: repositoriesIsLoading } = useMyRepositories();
  const [oid, setOid] = useState();

  const { handleSubmit, itemProps, values } = useForm<BranchFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating a branch" });

      try {
        const payload = { repositoryId: values.repository, issueId: values.issue, oid };
        const createResult = await github.createLinkedBranch({
          input: values.name === "" ? payload : { ...payload, name: values.name },
        });
        const branchName = createResult.createLinkedBranch?.linkedBranch?.ref?.name;

        toast.style = Toast.Style.Success;
        toast.title = `${branchName} is created`;

        if (branchName) {
          toast.primaryAction = {
            title: "Copy Branch Name",
            shortcut: { modifiers: ["shift", "cmd"], key: "c" },
            onAction: () => Clipboard.copy(branchName),
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
      name: draftValues?.name || "",
      oid: draftValues?.oid ?? "",
    },
    validation: {
      repository: FormValidation.Required,
      issue: FormValidation.Required,
    },
  });

  const { data, isLoading: repositoryIsLoading } = useCachedPromise(
    (repository) => {
      const selectedRepository = repositories?.find((r) => r.id === repository);

      if (!selectedRepository) {
        return Promise.resolve(null);
      }

      return github.repositoryIssues({ owner: selectedRepository.owner.login, name: selectedRepository.name });
    },
    [values.repository],
    { execute: !!values.repository }
  );

  const issues = data?.repository?.issues?.nodes?.filter((node) => node?.linkedBranches.totalCount == 0);

  useEffect(() => {
    data?.repository?.defaultBranchRef?.target?.oid && setOid(data?.repository?.defaultBranchRef?.target?.oid);
  }, [data]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Branch" />
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.Dropdown {...itemProps.repository} title="Repository" isLoading={repositoriesIsLoading} storeValue>
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

      <Form.Dropdown {...itemProps.issue} title="Issue" isLoading={repositoryIsLoading}>
        {issues?.map((issue) =>
          issue ? (
            <Form.Dropdown.Item
              key={issue?.id}
              title={`#${issue.number} ${issue.title}`}
              value={issue.id}
              {...getIssueStatus(issue)}
            />
          ) : null
        )}
      </Form.Dropdown>

      <Form.TextField {...itemProps.name} title="Name" placeholder="Optional branch name" />
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
