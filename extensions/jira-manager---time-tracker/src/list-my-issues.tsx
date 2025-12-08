import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Color,
  Form,
  useNavigation,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import {
  searchIssues,
  assignIssue,
  addComment,
  getMyself,
  getTransitions,
  transitionIssue,
  addWorklog,
  addWatcher,
  removeWatcher,
} from "./utils/jira";
import { startIssue, getActiveIssue, pauseIssue } from "./utils/storage";
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
  const {
    data: issues,
    isLoading,
    revalidate,
  } = usePromise(searchIssues, ["assignee = currentUser() ORDER BY updated DESC"]);
  const { data: activeIssue, revalidate: revalidateActiveIssue } = usePromise(getActiveIssue);
  const { data: currentUser } = usePromise(getMyself);

  const [, setDummy] = useState(0); // Trigger re-render for timer

  useEffect(() => {
    if (activeIssue && activeIssue.isRunning) {
      const interval = setInterval(() => {
        setDummy((prev) => prev + 1);
      }, 1000); // Update every second
      return () => clearInterval(interval);
    }
  }, [activeIssue]);

  async function handleStartWork(issueKey: string, summary: string) {
    try {
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

      await startIssue(issueKey, summary);
      showToast({ style: Toast.Style.Success, title: "Started working", message: issueKey });
      revalidateActiveIssue();

      // Auto-transition Logic
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
        revalidate();
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

  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const getElapsedTime = (startTime: number) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter your issues...">
      <List.EmptyView icon={Icon.CheckCircle} title="No issues found" description="You have no assigned issues." />
      {issues?.map((issue) => {
        const isActive = activeIssue?.issueKey === issue.key;
        return (
          <List.Item
            key={issue.id}
            title={issue.key}
            subtitle={issue.fields.summary}
            icon={issue.fields.issuetype.iconUrl}
            accessories={[
              isActive
                ? {
                    text: { value: `${getElapsedTime(activeIssue.startTime)}`, color: Color.Green },
                    tooltip: "Currently working on this issue",
                  }
                : { text: issue.fields.status.name },
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
                <Action
                  title={issue.fields.watches?.isWatching ? "Stop Watching" : "Start Watching"}
                  icon={issue.fields.watches?.isWatching ? Icon.EyeSlash : Icon.Eye}
                  onAction={async () => {
                    if (issue.fields.watches?.isWatching) {
                      await removeWatcher(issue.key, currentUser?.accountId || "");
                      showToast({ style: Toast.Style.Success, title: "Stopped watching issue" });
                    } else {
                      await addWatcher(issue.key);
                      showToast({ style: Toast.Style.Success, title: "Started watching issue" });
                    }
                    revalidate();
                  }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                />
                <Action.CopyToClipboard content={issue.key} title="Copy Key" />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
