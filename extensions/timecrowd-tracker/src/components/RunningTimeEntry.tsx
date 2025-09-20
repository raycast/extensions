import { List, Icon, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { stopTimeEntry, type User } from "@/api";
import { useCurrentTime } from "@/hooks";
import { categoryColors } from "@/helpers";

dayjs.extend(duration);

interface RunningTimeEntryProps {
  timeEntry: User["time_entry"];
  revalidateDailyActivities: () => void;
  revalidateUser: () => void;
}

export const RunningTimeEntry = ({ timeEntry, revalidateDailyActivities, revalidateUser }: RunningTimeEntryProps) => {
  const { task, team, category } = timeEntry;
  const currentTime = useCurrentTime();

  const handleStopTimeEntry = async () => {
    try {
      await stopTimeEntry(timeEntry.id);
      revalidateDailyActivities();
      revalidateUser();
      showToast(Toast.Style.Success, "Stopped time entry");
    } catch {
      showToast(Toast.Style.Failure, "Failed to stop time entry");
    }
  };

  return (
    <List.Section title="Running Time Entry">
      <List.Item
        icon={{
          source: Icon.Clock,
          tintColor: categoryColors[category.color - 1],
        }}
        title={task.title}
        subtitle={`${category.title} - ${team.name}`}
        accessories={[{ text: dayjs.duration(currentTime.diff(dayjs(timeEntry.started_at))).format("HH:mm:ss") }]}
        actions={
          <ActionPanel>
            <Action title="Stop Time Entry" onAction={handleStopTimeEntry} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
};
