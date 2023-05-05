import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { formatDuration } from "../helpers/datetime";
import useElapsedTime from "../hooks/useElapsedTime";
import { TimeEntry } from "../types";
import { StopTimerAction } from "./TrackTimeActions";

// Returns a `List.Section` that shows a running time entry that is either
// - unassociated with any `Todo`s, or
// - associated with a `Todo` that wasn't fetched for the view.
export default function FloatingRunningTimerSection({
  floatingRunningTimeEntry,
  revalidateTimeEntries,
  mutateTimeEntries,
}: {
  floatingRunningTimeEntry: TimeEntry | undefined;
  revalidateTimeEntries: (() => Promise<TimeEntry[]>) | (() => void) | undefined;
  mutateTimeEntries: MutatePromise<TimeEntry[]> | undefined;
}): JSX.Element {
  const runningTimeEntryDuration = useElapsedTime(floatingRunningTimeEntry?.start);

  return (
    <List.Section title="Running Timer">
      <List.Item
        icon={{ source: floatingRunningTimeEntry ? Icon.Stopwatch : Icon.Dot, tintColor: Color.SecondaryText }}
        title={floatingRunningTimeEntry?.title ?? ""}
        subtitle={floatingRunningTimeEntry ? undefined : "No running timer"}
        accessories={
          runningTimeEntryDuration
            ? [{ text: formatDuration(runningTimeEntryDuration, { style: "time", showSeconds: true }) }]
            : undefined
        }
        actions={
          floatingRunningTimeEntry ? (
            <ActionPanel>
              <StopTimerAction
                timeEntry={floatingRunningTimeEntry}
                revalidateTimeEntries={revalidateTimeEntries}
                mutateTimeEntries={mutateTimeEntries}
              />
            </ActionPanel>
          ) : null // "Create To-Do & Start Timer" action from `TodoListEmptyView` shows up.
        }
      />
    </List.Section>
  );
}
