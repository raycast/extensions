import { MenuBarExtra, Icon, launchCommand, LaunchType } from "@raycast/api";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { formatSeconds } from "@/helpers/formatSeconds";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { useProcessedTimeEntries } from "@/hooks/useProcessedTimeEntries";
import { useTimeEntryActions } from "@/hooks/useTimeEntryActions";
import { useTotalDurationToday } from "@/hooks/useTotalDurationToday";

dayjs.extend(duration);

export default function Command() {
  const {
    timeEntries,
    runningTimeEntry,
    isLoading,
    revalidateTimeEntries,
    revalidateRunningTimeEntry,
    timeEntriesWithUniqueProjectAndDescription,
  } = useProcessedTimeEntries();

  const totalDurationToday = useTotalDurationToday(timeEntries, runningTimeEntry);
  const { resumeTimeEntry, stopRunningTimeEntry } = useTimeEntryActions(
    revalidateRunningTimeEntry,
    revalidateTimeEntries,
  );
  const currentTime = useCurrentTime();

  const entry = runningTimeEntry;

  return (
    <MenuBarExtra
      icon={{ source: Icon.Circle, tintColor: entry?.project_color }}
      isLoading={isLoading}
      title={entry ? entry.description : ""}
      tooltip={
        entry
          ? dayjs.duration(dayjs(currentTime).diff(entry.start), "milliseconds").format("HH:mm:ss") +
            " | " +
            (entry.project_name ? entry.project_name + " | " : "") +
            (entry.client_name ?? "")
          : "No time entries"
      }
    >
      {entry && (
        <MenuBarExtra.Section title="Running time entry">
          <MenuBarExtra.Item
            icon={{ source: Icon.Circle, tintColor: entry?.project_color }}
            onAction={() => stopRunningTimeEntry(entry)}
            title={entry.description || ""}
            subtitle={
              dayjs.duration(dayjs(currentTime).diff(entry.start), "milliseconds").format("HH:mm:ss") +
              " | " +
              (entry.project_name ? entry.project_name + " | " : "") +
              (entry.client_name ?? "")
            }
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="Start/Stop Time Entry"
          icon={"command-icon.png"}
          onAction={() =>
            launchCommand({
              name: "index",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Recent time entries">
        {timeEntriesWithUniqueProjectAndDescription.map((timeEntry) => (
          <MenuBarExtra.Item
            key={timeEntry.id}
            title={timeEntry.description || "No description"}
            subtitle={(timeEntry.client_name ? timeEntry.client_name + " | " : "") + (timeEntry.project_name ?? "")}
            icon={{ source: Icon.Circle, tintColor: timeEntry.project_color }}
            onAction={() => resumeTimeEntry(timeEntry)}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Today">
        <MenuBarExtra.Item
          title={isLoading ? "Loading" : formatSeconds(totalDurationToday)}
          icon={{ source: Icon.Clock }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
