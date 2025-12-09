import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { createIssue, getMyself, getProjectIssueTypes, searchUsers } from "../../utils/jira";

export function CreateSubtask({
  parentKey,
  projectId,
  onCreated,
}: {
  parentKey: string;
  projectId: string;
  onCreated: () => void;
}) {
  const { pop } = useNavigation();
  const { data: issueTypes, isLoading: isLoadingTypes } = usePromise(
    (id) => (id ? getProjectIssueTypes(id) : Promise.resolve([])),
    [projectId],
  );
  const { data: currentUser } = usePromise(getMyself);
  const [, setSearchText] = useState("");
  const { data: users, isLoading: isLoadingUsers } = usePromise(searchUsers, [""]);

  async function handleSubmit(values: { summary: string; description: string; issuetype: string; assignee: string }) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Creating subtask..." });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {
        fields: {
          parent: {
            key: parentKey,
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
          project: {
            id: projectId,
          },
        },
      };

      if (values.assignee) {
        body.fields.assignee = { id: values.assignee };
      }

      const issue = await createIssue(body);

      showToast({ style: Toast.Style.Success, title: "Subtask created", message: issue.key });
      onCreated();
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to create subtask", message: String(error) });
    }
  }

  const allUsers = users || [];
  if (currentUser && !allUsers.find((u) => u.accountId === currentUser.accountId)) {
    allUsers.unshift(currentUser);
  }

  const subtaskTypes = issueTypes?.filter((t) => t.subtask) || [];

  return (
    <Form
      isLoading={isLoadingTypes || isLoadingUsers}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Subtask" />
        </ActionPanel>
      }
    >
      <Form.Description title="Parent Issue" text={parentKey} />
      {subtaskTypes.length > 0 ? (
        <>
          <Form.Dropdown id="issuetype" title="Subtask Type">
            {subtaskTypes.map((type) => (
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
              <Form.Dropdown.Item
                key={user.accountId}
                value={user.accountId}
                title={user.displayName}
                icon={Icon.Person}
              />
            ))}
          </Form.Dropdown>
          <Form.TextField id="summary" title="Summary" placeholder="Subtask summary" />
          <Form.TextArea id="description" title="Description" placeholder="Subtask description" />
        </>
      ) : (
        <Form.Description
          title="Notice"
          text="No subtask types available for this project. Please check your Jira project configuration."
        />
      )}
    </Form>
  );
}
