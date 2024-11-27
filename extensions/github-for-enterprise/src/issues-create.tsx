import { CREATE_ISSUE, GET_ISSUE_TEMPLATES, GET_REPOSITORIES } from "@/queries/issues";
import { CreateIssue, GetIssueTemplates, GetRepositories, Repository } from "@/types";
import { fetcher } from "@/utils";
import { Action, ActionPanel, Form, FormValues, popToRoot, showToast, ToastStyle } from "@raycast/api";
import matter from "gray-matter";
import { useMemo, useState } from "react";
import useSWRImmutable from "swr/immutable";

export default function Command() {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [template, setTemplate] = useState({ title: "", content: "" });
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [milestoneId, setMilestoneId] = useState("");
  const { data, error } = useSWRImmutable<GetRepositories>("repos", () => fetcher({ document: GET_REPOSITORIES }));
  const { data: issueTemplates } = useSWRImmutable<GetIssueTemplates>(
    repository ? repository.nameWithOwner : null,
    () =>
      fetcher({
        document: GET_ISSUE_TEMPLATES,
        variables: {
          name: repository?.name,
          owner: repository?.owner.login,
        },
      }),
  );

  const templates = useMemo(
    () =>
      issueTemplates?.repository?.object?.entries.map(({ name, object }) => {
        const { data: frontMatter, content } = matter(object.text);

        return {
          name,
          displayName: frontMatter.name,
          title: frontMatter.title,
          content,
        };
      }) || [],
    [issueTemplates],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createIssue = async ({ repositoryId, template, ...values }: FormValues) => {
    if (!repository) {
      return;
    }

    const { id } = repository;

    showToast(ToastStyle.Animated, "Creating issue");

    try {
      const { createIssue }: CreateIssue = await fetcher({
        document: CREATE_ISSUE,
        variables: {
          repositoryId: id,
          ...Object.keys(values)
            .filter((k) => (Array.isArray(values[k]) ? values[k].length > 0 : values[k]))
            .reduce(
              (a, k) => ({
                ...a,
                [k]: values[k],
              }),
              {},
            ),
        },
      });

      popToRoot();
      showToast(ToastStyle.Success, `Issue #${createIssue.issue.number} created`);
    } catch (err: any) {
      showToast(ToastStyle.Failure, "Could not create issue", err.message);
    }
  };

  if (error) {
    popToRoot();
    showToast(ToastStyle.Failure, "Could not get repositories", error.message);
  }

  return (
    <Form
      isLoading={!data}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" onSubmit={createIssue} />
        </ActionPanel>
      }
    >
      {data && (
        <>
          <Form.Dropdown
            id="repositoryId"
            title="Repository"
            onChange={(repo) => {
              setRepository(JSON.parse(repo));
              setTemplate({ title: "", content: "" });
              setAssigneeIds([]);
              setLabelIds([]);
              setProjectIds([]);
              setMilestoneId("");
            }}
          >
            {data?.user.repositories.nodes.map((repo) => (
              <Form.Dropdown.Item
                key={repo.nameWithOwner}
                title={repo.nameWithOwner}
                value={JSON.stringify(repo)}
                icon={{
                  source: repo.owner.avatarUrl,
                }}
              />
            ))}
          </Form.Dropdown>
          <Form.Separator />
          {templates.length > 0 && (
            <Form.Dropdown
              id="template"
              title="Template"
              onChange={(value) => {
                setTemplate(JSON.parse(value));
              }}
            >
              <Form.Dropdown.Item title="None" value={JSON.stringify({ title: "", content: "" })} />
              {templates.map(({ name, displayName, title, content }) => (
                <Form.Dropdown.Item
                  key={name}
                  title={displayName}
                  value={JSON.stringify({
                    title,
                    content,
                  })}
                />
              ))}
            </Form.Dropdown>
          )}
          <Form.TextField
            id="title"
            title="Title"
            placeholder="Issue title"
            onChange={(value) => {
              setTemplate((prev) => ({
                ...prev,
                title: value,
              }));
            }}
            value={template.title}
          />
          <Form.TextArea
            id="body"
            title="Description"
            placeholder="Issue description (Eg. **bold**)"
            onChange={(value) => {
              setTemplate((prev) => ({
                ...prev,
                content: value,
              }));
            }}
            value={template.content}
          />
          {repository?.viewerPermission !== "READ" && (
            <>
              {!!repository?.assignableUsers?.nodes.length && (
                <Form.TagPicker
                  id="assigneeIds"
                  title="Assignees"
                  placeholder="Type or choose an assignee"
                  value={assigneeIds}
                  onChange={setAssigneeIds}
                >
                  {repository.assignableUsers.nodes.map(({ id, login }) => (
                    <Form.TagPicker.Item key={id} title={login} value={id} />
                  ))}
                </Form.TagPicker>
              )}
              {!!repository?.labels?.nodes.length && (
                <Form.TagPicker
                  id="labelIds"
                  title="Labels"
                  placeholder="Type or choose a label"
                  value={labelIds}
                  onChange={setLabelIds}
                >
                  {repository.labels.nodes.map(({ id, name }) => (
                    <Form.TagPicker.Item key={id} title={name} value={id} />
                  ))}
                </Form.TagPicker>
              )}
              {!!repository?.projects?.nodes?.length && (
                <Form.TagPicker
                  id="projectIds"
                  title="Projects"
                  placeholder="Type or choose a project"
                  value={projectIds}
                  onChange={setProjectIds}
                >
                  {repository.projects.nodes.map(({ id, name }) => (
                    <Form.TagPicker.Item key={id} title={name} value={id} />
                  ))}
                </Form.TagPicker>
              )}
              {!!repository?.milestones?.nodes.length && (
                <Form.Dropdown id="milestoneId" title="Milestone" value={milestoneId} onChange={setMilestoneId}>
                  <Form.Dropdown.Item title="None" value="" />
                  {repository.milestones.nodes.map(({ id, title }) => (
                    <Form.Dropdown.Item key={id} title={title} value={id} />
                  ))}
                </Form.Dropdown>
              )}
            </>
          )}
        </>
      )}
    </Form>
  );
}
