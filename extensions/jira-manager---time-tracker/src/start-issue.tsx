import { Action, ActionPanel, List, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { searchIssues } from "./utils/jira";
import { startIssue } from "./utils/storage";

export default function Command() {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const { data: issues, isLoading } = usePromise(searchIssues, [
    searchText ? `text ~ "${searchText}*"` : "order by updated DESC",
  ]);

  async function handleStartWork(issueKey: string, summary: string) {
    try {
      await startIssue(issueKey, summary);
      showToast({ style: Toast.Style.Success, title: "Started working on issue", message: issueKey });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to start work", message: String(error) });
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search issue to start working..."
      throttle
    >
      {issues?.map((issue) => (
        <List.Item
          key={issue.id}
          title={issue.key}
          subtitle={issue.fields.summary}
          icon={issue.fields.issuetype.iconUrl}
          actions={
            <ActionPanel>
              <Action
                title="Start Work"
                icon="clock.png"
                onAction={() => handleStartWork(issue.key, issue.fields.summary)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
