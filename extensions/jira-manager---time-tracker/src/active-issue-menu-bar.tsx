import { MenuBarExtra, getPreferenceValues, open, Icon, Color, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { getActiveIssue, pauseIssue } from "./utils/storage";
import { usePromise } from "@raycast/utils";
import { Preferences } from "./utils/types";
import { addWorklog } from "./utils/jira";

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  const { data: activeIssue, isLoading, revalidate } = usePromise(getActiveIssue);

  if (isLoading) {
    return <MenuBarExtra isLoading />;
  }

  if (!activeIssue || !activeIssue.isRunning) {
    return (
      <MenuBarExtra icon={Icon.Clock} tooltip="No active issue">
        <MenuBarExtra.Item
          title="Start Issue"
          onAction={() => launchCommand({ name: "start-issue", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Search Issues"
          onAction={() => launchCommand({ name: "search-for-issues", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  const elapsedSeconds = Math.floor((Date.now() - activeIssue.startTime) / 1000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);

  // Reminder Logic
  const reminderMinutes = preferences.reminderInterval ? parseInt(preferences.reminderInterval) : 60;
  const showWarning = !isNaN(reminderMinutes) && elapsedMinutes >= reminderMinutes;

  const timeDisplay = `${h}h ${m}m`;
  const tooltip = `Working on ${activeIssue.issueKey}: ${activeIssue.summary || "No summary"}`;

  const icon = {
    source: showWarning ? Icon.Warning : Icon.Clock,
    tintColor: showWarning ? Color.Red : Color.PrimaryText,
  };

  const title = showWarning ? `${timeDisplay} (Long Session)` : `${activeIssue.issueKey} ${timeDisplay}`;

  async function handlePause() {
    const paused = await pauseIssue();
    if (paused) {
      await addWorklog(paused.issueKey, paused.timeSpentSeconds, "Auto-logged from Menu Bar", paused.started);
      await showHUD(`Paused ${paused.issueKey} and logged ${Math.floor(paused.timeSpentSeconds / 60)}m`);
      revalidate();
    }
  }

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={tooltip}>
      <MenuBarExtra.Section title="Current Issue">
        <MenuBarExtra.Item
          title={activeIssue.issueKey}
          subtitle={activeIssue.summary}
          icon={Icon.Tag}
          onAction={() =>
            open(`https://${preferences.jiraDomain.replace(/^https?:\/\//, "")}/browse/${activeIssue.issueKey}`)
          }
        />
        <MenuBarExtra.Item title={`Elapsed: ${h}h ${m}m ${elapsedSeconds % 60}s`} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Pause Work & Log Time" icon={Icon.Pause} onAction={handlePause} />
        <MenuBarExtra.Item
          title="Open Time Tracker"
          icon={Icon.AppWindow}
          onAction={() => launchCommand({ name: "daily-summary", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
