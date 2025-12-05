import { Action, ActionPanel, Detail, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getActiveIssue, getLastIssue, startIssue } from "./utils/storage";

// We need to store the *stopped* issue somewhere if we want to "resume" it easily without searching.
// However, our storage only keeps the *active* issue. When we stop/pause, we clear it.
// To implement "Resume", we should probably store the "last active issue" in a separate key.
// For now, let's implement a "Resume" that tries to find the last issue we worked on from purely local storage if we decided to save it,
// OR we can just fetch the most recently updated issue assigned to me.

// Let's modify storage first to save "lastStoppedIssue".

export default function Command() {
  const { pop } = useNavigation();
  const { data: activeIssue, isLoading: isLoadingActive } = usePromise(getActiveIssue);
  const { data: lastIssue, isLoading: isLoadingLast } = usePromise(getLastIssue);

  async function handleResume() {
    if (!lastIssue) return;
    try {
      await startIssue(lastIssue.issueKey, lastIssue.summary);
      showToast({ style: Toast.Style.Success, title: "Resumed issue", message: lastIssue.issueKey });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to resume", message: String(error) });
    }
  }

  const isLoading = isLoadingActive || isLoadingLast;

  if (isLoading) return <Detail isLoading />;

  if (activeIssue?.isRunning) {
    return (
      <Detail
        markdown={`## Issue currently running: **${activeIssue.issueKey}**\n\nPlease pause or stop it before resuming another issue.`}
      />
    );
  }

  if (!lastIssue) {
    return <Detail markdown="No recently active issue found to resume." />;
  }

  const markdown = `
  # Resume Work
  
  **Issue**: ${lastIssue.issueKey}
  **Summary**: ${lastIssue.summary || "N/A"}
  
  Do you want to continue tracking time for this issue?
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Resume Issue" icon="play.png" onAction={handleResume} />
        </ActionPanel>
      }
    />
  );
}
