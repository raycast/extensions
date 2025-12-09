import { Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  addWatcher,
  addWorklog,
  assignIssue,
  getMyself,
  getTransitions,
  removeWatcher,
  transitionIssue,
} from "../utils/jira";
import { getActiveIssue, pauseIssue, startIssue } from "../utils/storage";

export function useIssueActions(mutate?: () => void) {
  const { data: currentUser } = usePromise(getMyself);

  async function handleStartWork(issueKey: string, summary: string) {
    try {
      const activeIssue = await getActiveIssue();

      if (activeIssue && activeIssue.isRunning && activeIssue.issueKey !== issueKey) {
        const elapsedSeconds = Math.floor((Date.now() - activeIssue.startTime) / 1000);
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);

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

          if (!confirmed) return;

          await pauseIssue();
          showToast({
            style: Toast.Style.Success,
            title: "Time discarded",
            message: `${elapsedSeconds}s on ${activeIssue.issueKey} not logged`,
          });
        } else {
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

          if (!confirmed) return;

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
        mutate?.();
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
      mutate?.();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to assign issue", message: String(error) });
    }
  }

  async function handleToggleWatcher(issueKey: string, isWatching: boolean) {
    try {
      if (isWatching) {
        await removeWatcher(issueKey, currentUser?.accountId || "");
        showToast({ style: Toast.Style.Success, title: "Stopped watching issue" });
      } else {
        await addWatcher(issueKey);
        showToast({ style: Toast.Style.Success, title: "Started watching issue" });
      }
      mutate?.();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to toggle watcher", message: String(error) });
    }
  }

  async function handlePauseWork() {
    try {
      const paused = await pauseIssue();
      if (paused) {
        showToast({ style: Toast.Style.Success, title: "Issue paused", message: `${paused.issueKey}` });
        mutate?.();
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to pause work", message: String(error) });
    }
  }

  return {
    handleStartWork,
    handleAssignToMe,
    handleToggleWatcher,
    handlePauseWork,
    currentUser,
  };
}
