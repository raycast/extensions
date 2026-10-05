import { getPreferenceValues, LaunchProps } from "@raycast/api";
import TimerForm from "./timer-form";
import { TimerResponse } from "./hakuna-api";

interface Props {
  timer?: TimerResponse;
  projectId?: number;
  taskId?: number;
}

export default function Timer(
  props: Props &
    Partial<LaunchProps<{ launchContext: { timer?: TimerResponse } }>>,
) {
  const seed = props.timer ?? props.launchContext?.timer;
  const { apiToken } = getPreferenceValues<Preferences>();

  return (
    <TimerForm
      apiToken={apiToken}
      projectId={seed?.project?.id ?? props.projectId}
      taskId={seed?.task?.id ?? props.taskId}
      startTime={seed?.start_time}
      note={seed?.note}
      prefillFromLiveTimer={!seed}
    />
  );
}
