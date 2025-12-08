import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { createIssue, getProjectIssueTypes, getMyself, searchUsers, searchIssues } from "./utils/jira";

export default function Command() {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [selectedParentKey, setSelectedParentKey] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Search for parent issues
  const { data: parentIssues, isLoading: isLoadingParents } = usePromise(
    (query) => {
      if (!query) return Promise.resolve([]);
      // Search by key or summary
      const jql = `(key = "${query}" OR summary ~ "${query}*") AND assignee = currentUser() ORDER BY updated DESC`;
      return searchIssues(jql);
    },
    [searchText],
  );

  // Get subtask issue types for the selected project
  const { data: issueTypes, isLoading: isLoadingTypes } = usePromise(
    (id) => (id ? getProjectIssueTypes(id) : Promise.resolve([])),
    [selectedProjectId],
  );

  const { data: currentUser } = usePromise(getMyself);
  const [assigneeSearchText, setAssigneeSearchText] = useState("");
  const { data: users, isLoading: isLoadingUsers } = usePromise(searchUsers, [assigneeSearchText]);

  // When a parent issue is selected, set the project ID
  const handleParentChange = (value: string) => {
    setSelectedParentKey(value);
    const selectedIssue = parentIssues?.find((issue) => issue.key === value);
    if (selectedIssue) {
      setSelectedProjectId(selectedIssue.fields.project.id);
    }
  };

  async function handleSubmit(values: {
    parent: string;
    summary: string;
    description: string;
    issuetype: string;
    assignee: string;
  }) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Creating subtask..." });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {
        fields: {
          parent: {
            key: values.parent,
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
            id: selectedProjectId,
          },
        },
      };

      if (values.assignee) {
        body.fields.assignee = { id: values.assignee };
      }

      const issue = await createIssue(body);

      showToast({ style: Toast.Style.Success, title: "Subtask created", message: issue.key });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to create subtask", message: String(error) });
    }
  }

  const allUsers = users || [];
  if (currentUser && !allUsers.find((u) => u.accountId === currentUser.accountId)) {
    allUsers.unshift(currentUser);
  }

  // Filter only subtask issue types
  const subtaskTypes = issueTypes?.filter((t) => t.subtask) || [];

  return (
    <Form
      isLoading={isLoadingParents || isLoadingTypes || isLoadingUsers}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="parent"
        title="Parent Issue"
        placeholder="Search for parent issue..."
        value={selectedParentKey}
        onChange={handleParentChange}
        onSearchTextChange={setSearchText}
        throttle
      >
        {parentIssues?.map((issue) => (
          <Form.Dropdown.Item
            key={issue.key}
            value={issue.key}
            title={`${issue.key} - ${issue.fields.summary}`}
            icon={issue.fields.issuetype.iconUrl}
          />
        ))}
      </Form.Dropdown>

      {selectedParentKey && subtaskTypes.length > 0 && (
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
            onSearchTextChange={setAssigneeSearchText}
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
      )}

      {selectedParentKey && subtaskTypes.length === 0 && !isLoadingTypes && (
        <Form.Description
          title="Notice"
          text="No subtask types available for this project. Please check your Jira project configuration."
        />
      )}
    </Form>
  );
}
