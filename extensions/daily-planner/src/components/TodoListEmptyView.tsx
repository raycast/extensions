import { ActionPanel, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { formatDuration } from "../helpers/datetime";
import useElapsedTime from "../hooks/useElapsedTime";
import { TimeEntry } from "../types";
import { StopTimerAction } from "./TrackTimeActions";

export default function TodoListEmptyView({
  listName,
  searchText,
  floatingRunningTimeEntry,
  alsoStartTimer,
  getCreateTodoAction,
  revalidateTimeEntries,
  mutateTimeEntries,
}: {
  listName?: string;
  searchText: string;
  getCreateTodoAction: () => JSX.Element;
  floatingRunningTimeEntry?: TimeEntry; // a running time entry not associated with any to-dos.
  alsoStartTimer?: boolean;
  revalidateTimeEntries: (() => Promise<TimeEntry[]>) | (() => void) | undefined;
  mutateTimeEntries: MutatePromise<TimeEntry[]> | undefined;
}): JSX.Element {
  const runningTimeEntryDuration = useElapsedTime(floatingRunningTimeEntry?.start);

  const noTodoMessage =
    searchText === ""
      ? `Well done! There are no to-dos${listName ? ` in ${listName}` : ""}.`
      : `Do you want to create a new to-do titled "${searchText}"${alsoStartTimer ? " and start timer" : ""}?`;

  const runningTimeEntryMessage =
    floatingRunningTimeEntry && runningTimeEntryDuration !== undefined
      ? ` FYI, there's a running timer titled "${
          floatingRunningTimeEntry.title
        }" that's clocking in at ${formatDuration(runningTimeEntryDuration, { style: "time", showSeconds: true })}.`
      : "";

  return (
    <List.EmptyView
      icon={searchText === "🎉" ? "" : undefined}
      title={searchText === "" ? "No To-Dos" : "No To-Dos Found"}
      description={noTodoMessage + runningTimeEntryMessage}
      actions={
        <ActionPanel>
          {floatingRunningTimeEntry ? (
            <StopTimerAction
              timeEntry={floatingRunningTimeEntry}
              revalidateTimeEntries={revalidateTimeEntries}
              mutateTimeEntries={mutateTimeEntries}
            />
          ) : null}

          {getCreateTodoAction()}
        </ActionPanel>
      }
    />
  );
}
