import { Action, ActionPanel, List, showToast, Toast, useNavigation, confirmAlert, Alert, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { searchIssues, addWorklog } from "./utils/jira";
import { startIssue, getActiveIssue, pauseIssue } from "./utils/storage";

export default function Command() {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const { data: issues, isLoading } = usePromise(searchIssues, [
    searchText
      ? `text ~ "${searchText}*" AND assignee = currentUser()`
      : "assignee = currentUser() ORDER BY updated DESC",
  ]);

  async function handleStartWork(issueKey: string, summary: string) {
    try {
      const activeIssue = await getActiveIssue();

      // Check if there's already a running issue
      if (activeIssue && activeIssue.isRunning && activeIssue.issueKey !== issueKey) {
        const elapsedSeconds = Math.floor((Date.now() - activeIssue.startTime) / 1000);
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);

        // Warn if less than 1 minute of work
        if (elapsedSeconds < 60) {
          const confirmed = await confirmAlert({
            title: "Short Work Session",
            message: `You've only worked ${elapsedSeconds}s on ${activeIssue.issueKey}. This time won't be logged in Jira. Do you want to discard this time and start ${issueKey}?`,
            primaryAction: {
              title: "Discard & Start New",
              style: Alert.ActionStyle.Destructive,
            },
            dismissAction: {
              title: "Continue Current Task",
              style: Alert.ActionStyle.Cancel,
            },
            icon: Icon.Warning,
          });

          if (!confirmed) {
            return; // User chose to continue with current task
          }

          // Discard the current session without logging
          await pauseIssue(); // This removes it from storage
          showToast({
            style: Toast.Style.Success,
            title: "Time discarded",
            message: `${elapsedSeconds}s on ${activeIssue.issueKey} not logged`,
          });
        } else {
          // Normal flow: ask to pause and log
          const confirmed = await confirmAlert({
            title: "Issue Already Running",
            message: `${activeIssue.issueKey} is currently active (${elapsedMinutes}m worked). Do you want to pause it and start working on ${issueKey}?`,
            primaryAction: {
              title: "Pause & Start New",
              style: Alert.ActionStyle.Default,
            },
            dismissAction: {
              title: "Cancel",
              style: Alert.ActionStyle.Cancel,
            },
            icon: Icon.Clock,
          });

          if (!confirmed) {
            return; // User cancelled
          }

          // Pause the current issue and log the work
          showToast({ style: Toast.Style.Animated, title: "Pausing current issue..." });
          const paused = await pauseIssue();
          if (paused) {
            await addWorklog(
              paused.issueKey,
              paused.timeSpentSeconds,
              "Auto-logged when switching tasks",
              paused.started,
            );
            showToast({
              style: Toast.Style.Success,
              title: "Previous work logged",
              message: `${Math.floor(paused.timeSpentSeconds / 60)}m on ${paused.issueKey}`,
            });
          }
        }
      }

      // Start the new issue
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
