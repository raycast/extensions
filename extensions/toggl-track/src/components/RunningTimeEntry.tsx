import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import dayjs from "dayjs";

import { stopTimeEntry, TimeEntry, TimeEntryMetaData } from "@/api";
import useCurrentTime from "@/hooks/useCurrentTime";

interface RunningTimeEntryProps {
  runningTimeEntry: TimeEntry & TimeEntryMetaData;
  revalidateRunningTimeEntry: () => void;
  revalidateTimeEntries: () => void;
}

function RunningTimeEntry({
  runningTimeEntry,
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
        keywords={[
          runningTimeEntry.description,
          runningTimeEntry.project_name || "",
          runningTimeEntry.client_name || "",
        ]}
        subtitle={
          (runningTimeEntry.client_name ? runningTimeEntry.client_name + " | " : "") +
          (runningTimeEntry.project_name ?? "") +
          dayjs.duration(dayjs(currentTime).diff(runningTimeEntry.start), "milliseconds").format("HH:mm:ss")
        }
        accessories={[...runningTimeEntry.tags.map((tag) => ({ tag })), { text: runningTimeEntry.billable ? "$" : "" }]}
        icon={{ source: Icon.Circle, tintColor: runningTimeEntry.project_color }}
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
