import { getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import TimerForm from "./timer-form";
import { HakunaTimer } from "./hakuna-api";

export default function StartTimer() {
  const { apiToken } = getPreferenceValues<{ apiToken: string }>();
  const timer = new HakunaTimer(apiToken);

  return (
    <TimerForm
      apiToken={apiToken}
      mode="timer"
      enableDrafts
      submitLabel="Start Timer"
      onSubmit={async ({ taskId, projectId, startTime, note }) => {
        await timer.startTimer(taskId, projectId, startTime, note || undefined);
        await showToast({ style: Toast.Style.Success, title: "Timer started" });
        popToRoot();
      }}
    />
  );
}
