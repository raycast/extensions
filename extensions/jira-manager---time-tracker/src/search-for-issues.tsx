import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Form,
  useNavigation,
  Icon,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { searchIssues, addComment, assignIssue, getMyself, getTransitions, transitionIssue } from "./utils/jira";
import { startIssue } from "./utils/storage";
import { Preferences } from "./utils/types";

const preferences = getPreferenceValues<Preferences>();

function AddComment({ issueKey }: { issueKey: string }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { comment: string }) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Adding comment..." });
      await addComment(issueKey, values.comment);
      showToast({ style: Toast.Style.Success, title: "Comment added" });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to add comment", message: String(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Comment" />
        </ActionPanel>
      }
    >
      <Form.Description title="Issue" text={issueKey} />
      <Form.TextArea id="comment" title="Comment" placeholder="Write your comment here..." />
    </Form>
  );
}

function ChangeStatus({ issueKey, onTransition }: { issueKey: string; onTransition: () => void }) {
  const { data: transitions, isLoading } = usePromise(getTransitions, [issueKey]);
  const { pop } = useNavigation();

  async function handleTransition(transitionId: string, transitionName: string) {
    try {
      showToast({ style: Toast.Style.Animated, title: `Transitioning to ${transitionName}...` });
      await transitionIssue(issueKey, transitionId);
      showToast({ style: Toast.Style.Success, title: "Status updated" });
      onTransition();
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to update status", message: String(error) });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Select New Status">
      {transitions?.map((t) => (
        <List.Item
          key={t.id}
          title={t.name}
          actions={
            <ActionPanel>
              <Action title={`Move to ${t.name}`} onAction={() => handleTransition(t.id, t.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all-open");

  const getJql = () => {
    let baseJql = "";
    switch (filterType) {
      case "all-open":
        baseJql = "created >= -30d ORDER BY created DESC";
        break;
      case "my-issues":
        baseJql = "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC";
        break;
      case "reported-by-me":
        baseJql = "reporter = currentUser() ORDER BY created DESC";
        break;
      case "done-recently":
        baseJql = "statusCategory = Done AND updated >= -7d ORDER BY updated DESC";
        break;
      default:
        baseJql = "created >= -30d ORDER BY created DESC";
    }

    if (searchText) {
      // If we have search text, we combine it.
      // Note: If baseJql has ORDER BY, we need to be careful. JQL requires ORDER BY at the end.
      // Simple string manipulation for this MVP:
      const cleanBase = baseJql.split("ORDER BY")[0];
      const orderBy = baseJql.split("ORDER BY")[1] ? "ORDER BY" + baseJql.split("ORDER BY")[1] : "";
      return `(${cleanBase}) AND text ~ "${searchText}*" ${orderBy}`;
    }

    return baseJql;
  };

  const { data: issues, isLoading, revalidate } = usePromise(searchIssues, [getJql()]);
  const { data: currentUser } = usePromise(getMyself);

  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  async function handleStartWork(issueKey: string, summary: string) {
    try {
      await startIssue(issueKey, summary);
      showToast({ style: Toast.Style.Success, title: "Started working", message: issueKey });

      // Auto-transition to "In Progress" if possible
      // We need to fetch transitions first
      const transitions = await getTransitions(issueKey);
      const inProgressTransition = transitions.find(
        (t) =>
          t.name.toLowerCase() === "in progress" ||
          t.name.toLowerCase() === "en curso" ||
          t.to.name.toLowerCase() === "in progress",
      );

      if (inProgressTransition) {
        await transitionIssue(issueKey, inProgressTransition.id);
        showToast({ style: Toast.Style.Success, title: "Issue moved to In Progress" });
        revalidate(); // Refresh list to show new status
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to start work", message: String(error) });
    }
  }

  async function handleAssignToMe(issueKey: string) {
    if (!currentUser) return;
    try {
      showToast({ style: Toast.Style.Animated, title: "Assigning issue..." });
      await assignIssue(issueKey, currentUser.accountId);
      showToast({ style: Toast.Style.Success, title: "Issue assigned to you" });
      revalidate();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to assign issue", message: String(error) });
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search issues..."
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Issues" onChange={setFilterType}>
          <List.Dropdown.Section title="Presets">
            <List.Dropdown.Item title="Recent Issues (All)" value="all-open" />
            <List.Dropdown.Item title="Assigned to Me" value="my-issues" />
            <List.Dropdown.Item title="Reported by Me" value="reported-by-me" />
            <List.Dropdown.Item title="Done Recently" value="done-recently" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {issues?.map((issue) => (
        <List.Item
          key={issue.id}
          title={issue.key}
          subtitle={issue.fields.summary}
          icon={issue.fields.issuetype.iconUrl}
          accessories={[
            { text: issue.fields.status.name },
            { text: issue.fields.assignee?.displayName || "Unassigned" },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://${domain}/browse/${issue.key}`} />
              <Action
                title="Start Work"
                icon="clock.png"
                onAction={() => handleStartWork(issue.key, issue.fields.summary)}
              />
              <Action.Push
                title="Change Status"
                icon={Icon.ArrowRight}
                target={<ChangeStatus issueKey={issue.key} onTransition={revalidate} />}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title="Assign to Me"
                icon={Icon.Person}
                onAction={() => handleAssignToMe(issue.key)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
              <Action.Push
                title="Add Comment"
                icon={Icon.Bubble}
                target={<AddComment issueKey={issue.key} />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action.CopyToClipboard content={issue.key} title="Copy Key" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
