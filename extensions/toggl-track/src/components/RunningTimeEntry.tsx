import { List, Icon, ActionPanel, Action } from "@raycast/api";
import dayjs from "dayjs";

import { TimeEntry, TimeEntryMetaData } from "@/api";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { useTimeEntryActions } from "@/hooks/useTimeEntryActions";

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
  const { stopRunningTimeEntry } = useTimeEntryActions(revalidateRunningTimeEntry, revalidateTimeEntries);

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
            <Action.SubmitForm
              icon={{ source: Icon.Clock }}
              onSubmit={() => stopRunningTimeEntry(runningTimeEntry)}
              title="Stop Time Entry"
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

export default RunningTimeEntry;
