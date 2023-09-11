import { Action, ActionPanel, Clipboard, Form, Icon, Image, Toast, useNavigation, showToast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect } from "react";

import IssueDetail from "./components/IssueDetail";
import View from "./components/View";
import { getErrorMessage } from "./helpers/errors";
import { getGitHubUser } from "./helpers/users";
import { getGitHubClient } from "./helpers/withGithubClient";
import { useMyRepositories } from "./hooks/useRepositories";

type IssueFormValues = {
  repository: string;
  title: string;
  description: string;
  reviewers: string[];
  assignees: string[];
  labels: string[];
  projects: string[];
  milestone: string;
};

type IssueFormProps = {
  draftValues?: IssueFormValues;
};

export function IssueForm({ draftValues }: IssueFormProps) {
  const { push } = useNavigation();
  const { data: repositories } = useMyRepositories();
  const { github } = getGitHubClient();

  const { handleSubmit, itemProps, values, setValue, reset, focus } = useForm<IssueFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating issue" });

      try {
        const createResult = await github.createIssue({
          repositoryId: values.repository,
          title: values.title,
          body: values.description,
          assigneeIds: values.assignees,
          labelIds: values.labels,
          milestoneId: values.milestone || null,
        });

        const issue = createResult?.createIssue?.issue;

        if (issue) {
          // It's not possible to add an issue to a project from the createIssue call
          await Promise.all(
            values.projects.map((projectId) => github.addIssueToProject({ issueId: issue.id, projectId })),
          );

          toast.style = Toast.Style.Success;
          toast.title = "Created issue";

          toast.primaryAction = {
            title: "Open Issue",
            shortcut: { modifiers: ["shift", "cmd"], key: "o" },
            onAction: () => push(<IssueDetail initialIssue={issue} />),
          };

          toast.secondaryAction = {
            title: `Copy URL`,
            shortcut: { modifiers: ["shift", "cmd"], key: "c" },
            onAction: () => Clipboard.copy(issue.url),
          };
        }

        reset({
          title: "",
          description: "",
          reviewers: [],
          assignees: [],
          labels: [],
          projects: [],
          milestone: "",
        });

        focus("repository");
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed creating issue";
        toast.message = getErrorMessage(error);
      }
    },
    initialValues: {
      repository: draftValues?.repository ?? "",
      title: draftValues?.title ?? "",
      description: draftValues?.description ?? "",
      reviewers: draftValues?.reviewers ?? [],
      assignees: draftValues?.assignees ?? [],
      labels: draftValues?.labels ?? [],
      projects: draftValues?.projects ?? [],
      milestone: draftValues?.milestone ?? "",
    },
    validation: {
      repository: FormValidation.Required,
      title: FormValidation.Required,
    },
  });

  const { data } = useCachedPromise(
    (repository) => {
      const selectedRepository = repositories?.find((r) => r.id === repository);

      if (!selectedRepository) {
        return Promise.resolve(null);
      }

      return github.dataForRepository({ owner: selectedRepository.owner.login, name: selectedRepository.name });
    },
    [values.repository],
    { execute: !!values.repository },
  );

  const collaborators = data?.repository?.collaborators?.nodes;

  const labels = data?.repository?.labels?.nodes;

  const projects = data?.repository?.projectsV2?.nodes;

  const milestones = data?.repository?.milestones?.nodes;

  useEffect(() => {
    setValue("title", "");
    setValue("description", "");
    setValue("assignees", []);
    setValue("labels", []);
    setValue("projects", []);
    setValue("milestone", "");
  }, [values.repository]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Issue" />
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.Dropdown {...itemProps.repository} title="Repository" storeValue>
        {repositories?.map((repository) => {
          return (
            <Form.Dropdown.Item
              key={repository.id}
              title={repository.nameWithOwner}
              value={repository.id}
              icon={{ source: repository.owner.avatarUrl, mask: Image.Mask.Circle }}
            />
          );
        })}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField {...itemProps.title} title="Title" placeholder="Issue title" />

      <Form.TextArea
        {...itemProps.description}
        placeholder="Issue description (e.g **bold**)"
        title="Description"
        enableMarkdown
      />

      <Form.TagPicker {...itemProps.assignees} title="Assignees">
        {collaborators?.map((collaborator) => {
          if (!collaborator) {
            return null;
          }

          const user = getGitHubUser(collaborator);

          return (
            <Form.TagPicker.Item key={collaborator.id} icon={user.icon} title={user.text} value={collaborator.id} />
          );
        })}
      </Form.TagPicker>

      <Form.TagPicker {...itemProps.labels} title="Labels">
        {labels?.map((label) => {
          if (!label) {
            return null;
          }

          return (
            <Form.TagPicker.Item
              key={label.id}
              title={label.name}
              value={label.id}
              icon={{ source: Icon.Dot, tintColor: label.color }}
            />
          );
        })}
      </Form.TagPicker>

      <Form.TagPicker {...itemProps.projects} title="Projects">
        {projects?.map((project) => {
          if (!project) {
            return null;
          }

          return <Form.TagPicker.Item key={project.id} title={project.title} value={project.id} />;
        })}
      </Form.TagPicker>

      <Form.Dropdown {...itemProps.milestone} title="Milestone">
        <Form.Dropdown.Item value="" title="None" />

        {milestones?.map((milestone) => {
          if (!milestone) {
            return null;
          }

          return <Form.Dropdown.Item key={milestone.id} title={milestone.title} value={milestone.id} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}

export default function Command(props: { draftValues?: IssueFormValues }) {
  return (
    <View>
      <IssueForm draftValues={props.draftValues} />
    </View>
  );
}
