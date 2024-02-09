import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import dayjs from "dayjs";
import useCurrentTime from "../hooks/useCurrentTime";
import { stopTimeEntry, TimeEntry, Project } from "../api";

interface RunningTimeEntryProps {
  runningTimeEntry: TimeEntry;
  project?: Project;
  revalidateRunningTimeEntry: () => void;
  revalidateTimeEntries: () => void;
}

function RunningTimeEntry({
  runningTimeEntry,
  project,
  revalidateRunningTimeEntry,
  revalidateTimeEntries,
}: RunningTimeEntryProps) {
  const currentTime = useCurrentTime();

  const stopRunningTimeEntry = async () => {
    await showToast(Toast.Style.Animated, "Stopping time entry...");
    try {
      await stopTimeEntry({ id: runningTimeEntry.id, workspaceId: runningTimeEntry.workspace_id });
      await showToast(Toast.Style.Success, `Stopped time entry`);
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed to stop time entry");
      return;
    }
    revalidateRunningTimeEntry();
    revalidateTimeEntries();
  };

  return (
    <List.Section title="Running time entry" key="running-time-entry">
      <List.Item
        title={runningTimeEntry.description || "No description"}
        subtitle={
          (runningTimeEntry.billable ? "$  " : "") +
          dayjs.duration(dayjs(currentTime).diff(runningTimeEntry.start), "milliseconds").format("HH:mm:ss")
        }
        accessories={[{ text: project?.name }, { icon: { source: Icon.Dot, tintColor: project?.color } }]}
        icon={{ source: Icon.Clock, tintColor: project?.color }}
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={{ source: Icon.Clock }} onSubmit={stopRunningTimeEntry} title="Stop Time Entry" />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

export default RunningTimeEntry;
