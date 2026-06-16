import { Action, ActionPanel, Color, Form, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { LabelPicker } from "./components/issues";
import { useCreateIssueMetadata } from "./hooks/useCreateIssueMetadata";
import { useCreateIssueMutation } from "./hooks/useCreateIssueMutation";
import { useUserRepositories } from "./hooks/useUserRepositories";
import type { Repository } from "./types/api";
import { buildCreateIssueParams, parseRepo, type CreateIssueFormValues } from "./utils/create-issue";

const MAX_REPOSITORY_PREFETCH_PAGES = 2;

export default function Command(props: { initialRepo?: Repository }) {
  const { items: repositories, isLoading, pagination } = useUserRepositories();
  const { createIssue, isSubmitting } = useCreateIssueMutation();
  const [selectedRepo, setSelectedRepo] = useState<string>(props.initialRepo?.full_name ?? "");
  const [formKey, setFormKey] = useState(0);
  const prefetchedRepositoryPages = useRef(1);

  useEffect(() => {
    if (!isLoading && pagination.hasMore && prefetchedRepositoryPages.current < MAX_REPOSITORY_PREFETCH_PAGES) {
      prefetchedRepositoryPages.current += 1;
      pagination.onLoadMore();
    }
  }, [isLoading, pagination]);

  const repoOptions = useMemo(() => {
    return repositories
      .filter((repo): repo is Repository => Boolean(repo.owner?.login && repo.name))
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
  }, [repositories]);

  const { owner, repo } = useMemo(() => parseRepo(selectedRepo), [selectedRepo]);
  const { labels, milestones, assignees } = useCreateIssueMetadata(owner, repo);

  const isRepoSelected = Boolean(selectedRepo);

  const initialRepo = props.initialRepo;

  const resetForm = () => {
    setFormKey((key) => key + 1);
    setSelectedRepo(initialRepo?.full_name ?? "");
  };

  return (
    <Form
      key={formKey}
      isLoading={isLoading || isSubmitting}
      enableDrafts={initialRepo === undefined}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" onSubmit={(values) => handleSubmit(values, createIssue, resetForm)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="repository"
        title="Repository"
        isLoading={isLoading}
        value={selectedRepo}
        onChange={(value) => setSelectedRepo(value)}
        placeholder="Select a repository"
      >
        {initialRepo ? (
          <Form.Dropdown.Section>
            <Form.Dropdown.Item
              key={initialRepo.id ?? initialRepo.full_name ?? initialRepo.name ?? "repo"}
              title={initialRepo.full_name ?? initialRepo.name ?? ""}
              icon={getRepositoryIcon(initialRepo)}
              value={initialRepo.full_name ?? ""}
            />
          </Form.Dropdown.Section>
        ) : null}
        {repoOptions
          .filter((repo) => !(initialRepo && repo.full_name === initialRepo.full_name))
          .map((repo) => (
            <Form.Dropdown.Item
              key={repo.id ?? repo.full_name ?? repo.name ?? "repo"}
              title={repo.full_name ?? repo.name ?? ""}
              icon={getRepositoryIcon(repo)}
              value={repo.full_name ?? ""}
            />
          ))}
      </Form.Dropdown>
      {isRepoSelected && (
        <>
          <Form.Separator />
          <Form.TextField id="title" title="Title" placeholder="Issue title" />
          <Form.TextArea id="body" title="Description" placeholder="Describe the issue" />

          <Form.Separator />

          {labels.length > 0 && (
            <>
              <LabelPicker labels={labels} selectedRepo={isRepoSelected} />
              <Form.Separator />
            </>
          )}

          <Form.TagPicker id="assignees" title="Assignees" placeholder="Select assignees">
            {assignees.map((user) => (
              <Form.TagPicker.Item
                key={user.login ?? user.id ?? "user"}
                value={user.login ?? ""}
                title={user.login ?? ""}
                icon={{ source: user.avatar_url ?? Icon.Person }}
              />
            ))}
          </Form.TagPicker>
          <Form.Dropdown id="milestone" title="Milestone" placeholder="Select a milestone">
            <Form.Dropdown.Item value="" title="No milestone" />
            {milestones.map((milestone) => (
              <Form.Dropdown.Item
                key={milestone.id ?? milestone.title ?? "milestone"}
                value={String(milestone.id ?? "")}
                title={milestone.title ?? ""}
              />
            ))}
          </Form.Dropdown>
          <Form.DatePicker id="dueDate" title="Due Date" />
        </>
      )}
    </Form>
  );
}

function getRepositoryIcon(repo: Repository) {
  const avatarUrl = repo.avatar_url || repo.owner?.avatar_url;
  return avatarUrl ? { source: avatarUrl } : { source: "icon/repo.svg", tintColor: Color.PrimaryText };
}

async function handleSubmit(
  values: Form.Values,
  createIssue: ReturnType<typeof useCreateIssueMutation>["createIssue"],
  resetForm: () => void,
) {
  const formValues = values as CreateIssueFormValues;
  if (!formValues.repository || !formValues.title?.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "Repository and title are required" });
    return;
  }

  const params = buildCreateIssueParams(formValues);
  if (!params || "error" in params) {
    await showFailureToast(params?.error, {
      title: "Invalid form data",
    });
    return;
  }

  const didCreate = await createIssue(params);
  if (didCreate) {
    resetForm();
  }
}
