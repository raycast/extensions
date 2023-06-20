import { Action, ActionPanel, Clipboard, Form, Icon, Image, Toast, useNavigation, showToast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect } from "react";

import PullRequestDetail from "./components/PullRequestDetail";
import View from "./components/View";
import { getErrorMessage } from "./helpers/errors";
import { getGitHubUser } from "./helpers/users";
import { getGitHubClient } from "./helpers/withGithubClient";
import { useMyRepositories } from "./hooks/useRepositories";

type PullRequestFormValues = {
  repository: string;
  from: string;
  into: string;
  draft: boolean;
  title: string;
  description: string;
  reviewers: string[];
  assignees: string[];
  labels: string[];
  projects: string[];
  milestone: string;
};

type PullRequestFormProps = {
  draftValues?: PullRequestFormValues;
};

export function PullRequestForm({ draftValues }: PullRequestFormProps) {
  const { push } = useNavigation();
  const { data: repositories } = useMyRepositories();
  const { github } = getGitHubClient();

  const { handleSubmit, itemProps, values, setValue, reset, focus } = useForm<PullRequestFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating pull request" });

      try {
        const createResult = await github.createPullRequest({
          repositoryId: values.repository,
          from: values.from,
          into: values.into,
          title: values.title,
          body: values.description,
          isDraft: values.draft,
        });

        const pullRequestId = createResult?.createPullRequest?.pullRequest?.id;

        if (pullRequestId) {
          const updateResult = await github.initPullRequest({
            pullRequestId,
            reviewersIds: values.reviewers,
            assigneeIds: values.assignees,
            labelsIds: values.labels,
            milestoneId: values.milestone || null,
          });

          // It's not possible to add a PR to a project from the initPullRequest call
          await Promise.all(
            values.projects.map((projectId) => github.addPullRequestToProject({ pullRequestId, projectId }))
          );

          const pullRequest = updateResult?.updatePullRequest?.pullRequest;

          toast.style = Toast.Style.Success;
          toast.title = "Created pull request";

          if (pullRequest) {
            toast.primaryAction = {
              title: "Open Pull Request",
              shortcut: { modifiers: ["shift", "cmd"], key: "o" },
              onAction: () => push(<PullRequestDetail initialPullRequest={pullRequest} />),
            };

            toast.secondaryAction = {
              title: `Copy URL`,
              shortcut: { modifiers: ["shift", "cmd"], key: "c" },
              onAction: () => Clipboard.copy(pullRequest.permalink),
            };
          }
        }

        reset({
          title: "",
          from: "",
          into: "",
          draft: false,
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
        toast.title = "Failed creating pull request";
        toast.message = getErrorMessage(error);
      }
    },
    initialValues: {
      repository: draftValues?.repository ?? "",
      from: draftValues?.from ?? "",
      into: draftValues?.into ?? "",
      draft: draftValues?.draft ?? false,
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
      from: FormValidation.Required,
      into: FormValidation.Required,
      title: FormValidation.Required,
    },
  });

  const { data, isLoading } = useCachedPromise(
    (repository) => {
      const selectedRepository = repositories?.find((r) => r.id === repository);

      if (!selectedRepository) {
        return Promise.resolve(null);
      }

      return github.dataForRepository({ owner: selectedRepository.owner.login, name: selectedRepository.name });
    },
    [values.repository],
    { execute: !!values.repository }
  );

  const defaultBranch = data?.repository?.defaultBranchRef;

  const fromBranches = data?.repository?.refs?.nodes?.filter((node) => defaultBranch?.id !== node?.id && !!node?.name);

  const intoBranches = data?.repository?.refs?.nodes?.filter((node) => node?.name !== values.from);

  const collaborators = data?.repository?.collaborators?.nodes;

  const reviewers = collaborators?.filter((collaborator) => !collaborator?.isViewer);

  const labels = data?.repository?.labels?.nodes;

  const projects = data?.repository?.projectsV2?.nodes;

  const milestones = data?.repository?.milestones?.nodes;

  useEffect(() => {
    const template = data?.repository?.pullRequestTemplateLowercase ?? data?.repository?.pullRequestTemplateUppercase;

    if (template && "text" in template && template.text && !values.description) {
      setValue("description", template.text);
    }

    if (defaultBranch) {
      setValue("into", defaultBranch.name);
    }
  }, [data]);

  useEffect(() => {
    setValue("from", "");
    setValue("into", "");
    setValue("title", "");
    setValue("description", "");
    setValue("reviewers", []);
    setValue("assignees", []);
    setValue("labels", []);
    setValue("projects", []);
    setValue("milestone", "");
  }, [values.repository]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Pull Request" />
        </ActionPanel>
      }
      enableDrafts
      isLoading={isLoading}
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

      <Form.Dropdown {...itemProps.from} title="From">
        {fromBranches
          ? fromBranches.map((branch) => {
              if (!branch) {
                return null;
              }

              return <Form.Dropdown.Item key={branch?.id} title={branch.name} value={branch.name} />;
            })
          : null}
      </Form.Dropdown>

      <Form.Dropdown {...itemProps.into} title="Into" storeValue>
        {intoBranches
          ? intoBranches.map((branch) => {
              if (!branch) {
                return null;
              }

              return <Form.Dropdown.Item key={branch?.id} title={branch.name} value={branch.name} />;
            })
          : null}
      </Form.Dropdown>

      <Form.Checkbox {...itemProps.draft} label="As draft" />

      <Form.Separator />

      <Form.TextField {...itemProps.title} title="Title" placeholder="Pull request title" />

      <Form.TextArea
        {...itemProps.description}
        placeholder="Pull request description (e.g **bold**)"
        title="Description"
        enableMarkdown
      />

      <Form.TagPicker {...itemProps.reviewers} title="Reviewers">
        {reviewers?.map((reviewer) => {
          if (!reviewer) {
            return null;
          }

          const user = getGitHubUser(reviewer);

          return <Form.TagPicker.Item key={reviewer.id} icon={user.icon} title={user.text} value={reviewer.id} />;
        })}
      </Form.TagPicker>

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

export default function Command(props: { draftValues?: PullRequestFormValues }) {
  return (
    <View>
      <PullRequestForm draftValues={props.draftValues} />
    </View>
  );
}
