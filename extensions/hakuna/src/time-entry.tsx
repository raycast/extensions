import { getPreferenceValues, LaunchProps } from "@raycast/api";
import { TimeEntryResponse } from "./hakuna-api";
import TimerForm from "./timer-form";

interface Props {
  timeEntry?: TimeEntryResponse;
  projectId?: number;
  taskId?: number;
  clone?: boolean;
}

export default function TimeEntry(
  props: Props &
    Partial<LaunchProps<{ launchContext: { timeEntry?: TimeEntryResponse } }>>,
) {
  const { clone = false, projectId, taskId } = props;
  const timeEntry = props.timeEntry ?? props.launchContext?.timeEntry;

  const { apiToken } = getPreferenceValues<Preferences>();

  return (
    <TimerForm
      apiToken={apiToken}
      entryId={clone ? undefined : timeEntry?.id}
      date={timeEntry?.date}
      projectId={timeEntry?.project?.id ?? projectId}
      taskId={timeEntry?.task?.id ?? taskId}
      startTime={timeEntry?.start_time}
      endTime={timeEntry?.end_time}
      note={timeEntry?.note}
    />
  );
}
