import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { createIssue, getProjects, getMyself, searchUsers, getProjectIssueTypes } from "./utils/jira";

export default function Command() {
  const { pop } = useNavigation();
  const { data: projects, isLoading: isLoadingProjects } = usePromise(getProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { data: issueTypes, isLoading: isLoadingTypes } = usePromise(
    (id) => (id ? getProjectIssueTypes(id) : Promise.resolve([])),
    [selectedProjectId],
  );

  const { data: currentUser } = usePromise(getMyself);
  const [searchText, setSearchText] = useState("");
  const { data: users, isLoading: isLoadingUsers } = usePromise(searchUsers, [searchText]);

  if (projects && projects.length > 0 && !selectedProjectId) {
    setSelectedProjectId(projects[0].id);
  }

  async function handleSubmit(values: {
    summary: string;
    description: string;
    issuetype: string;
    project: string;
    assignee: string;
  }) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Creating issue..." });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {
        fields: {
          project: {
            id: values.project,
          },
          summary: values.summary,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: values.description || "",
                  },
                ],
              },
            ],
          },
          issuetype: {
            id: values.issuetype,
          },
        },
      };

      if (values.assignee) {
        body.fields.assignee = { id: values.assignee };
      }

      const issue = await createIssue(body);

      showToast({ style: Toast.Style.Success, title: "Issue created", message: issue.key });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to create issue", message: String(error) });
    }
  }

  const allUsers = users || [];
  if (currentUser && !allUsers.find((u) => u.accountId === currentUser.accountId)) {
    allUsers.unshift(currentUser);
  }

  return (
    <Form
      isLoading={isLoadingProjects || isLoadingTypes || isLoadingUsers}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="project" title="Project" onChange={setSelectedProjectId} value={selectedProjectId}>
        {projects?.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={`${project.key} - ${project.name}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="issuetype" title="Issue Type">
        {issueTypes
          ?.filter((t) => !t.subtask)
          .map((type) => (
            <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} icon={type.iconUrl} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="assignee"
        title="Assignee"
        placeholder="Select assignee"
        defaultValue={currentUser?.accountId}
        onSearchTextChange={setSearchText}
        throttle
      >
        {allUsers.map((user) => (
          <Form.Dropdown.Item key={user.accountId} value={user.accountId} title={user.displayName} icon={Icon.Person} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="summary" title="Summary" placeholder="Issue summary" />
      <Form.TextArea id="description" title="Description" placeholder="Issue description" />
    </Form>
  );
}
