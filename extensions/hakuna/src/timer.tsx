import { getPreferenceValues, LaunchProps } from "@raycast/api";
import TimerForm from "./timer-form";
import { HakunaClient, TimerResponse } from "./hakuna-api";

interface Props {
  timer?: TimerResponse;
  projectId?: number;
  taskId?: number;
}

export default async function Timer(
  props: Props &
    Partial<LaunchProps<{ launchContext: { timer?: TimerResponse } }>>,
) {
  const timer = props.timer ?? props.launchContext?.timer;
  const { projectId, taskId } = props;

  const { apiToken } = getPreferenceValues<Preferences>();
  if (timer) {
    return form(
      apiToken,
      timer?.project?.id,
      timer?.task?.id,
      timer?.start_time,
      timer?.note,
    );
  }

  const liveTimer = await new HakunaClient(apiToken).getTimer();
  if (liveTimer) {
    return form(
      apiToken,
      liveTimer?.project?.id,
      liveTimer?.task?.id,
      liveTimer?.start_time,
      liveTimer?.note,
    );
  }

  return form(apiToken, projectId, taskId);
}

function form(
  apiToken: string,
  projectId?: number,
  taskId?: number,
  startTime: string | undefined = undefined,
  note: string | undefined = undefined,
) {
  return (
    <TimerForm
      apiToken={apiToken}
      projectId={projectId}
      taskId={taskId}
      startTime={startTime}
      note={note}
    />
  );
}
