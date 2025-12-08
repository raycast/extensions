import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { searchUsers, assignIssue, getMyself } from "./utils/jira";

interface AssignIssueProps {
  initialIssueKey?: string;
}

export default function Command({ initialIssueKey }: AssignIssueProps) {
  const [issueKey, setIssueKey] = useState<string>(initialIssueKey || "");
  const [userQuery, setUserQuery] = useState("");
  const { pop } = useNavigation();

  const { data: users, isLoading: isLoadingUsers } = usePromise(searchUsers, [userQuery]);
  const { data: currentUser } = usePromise(getMyself);

  async function handleSubmit(values: { issueKey: string; assignee: string }) {
    if (!values.issueKey) {
      showToast({ style: Toast.Style.Failure, title: "Issue Key is required" });
      return;
    }
    if (!values.assignee) {
      showToast({ style: Toast.Style.Failure, title: "Assignee is required" });
      return;
    }

    try {
      showToast({ style: Toast.Style.Animated, title: `Assigning ${values.issueKey}...` });
      await assignIssue(values.issueKey, values.assignee);
      showToast({ style: Toast.Style.Success, title: "Issue Assigned" });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to assign issue", message: String(error) });
    }
  }

  const allUsers = users || [];
  // Ensure current user is in the list
  if (currentUser && !allUsers.find((u) => u.accountId === currentUser.accountId)) {
    allUsers.unshift(currentUser);
  }

  return (
    <Form
      navigationTitle="Assign Issue"
      isLoading={isLoadingUsers}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Assign Issue" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="issueKey"
        title="Issue Key"
        placeholder="e.g. PROJ-123"
        value={issueKey}
        onChange={setIssueKey}
        autoFocus
      />

      <Form.Dropdown
        id="assignee"
        title="Assignee"
        placeholder="Search user..."
        onSearchTextChange={setUserQuery}
        throttle
      >
        {allUsers.map((user) => (
          <Form.Dropdown.Item key={user.accountId} value={user.accountId} title={user.displayName} icon={Icon.Person} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
