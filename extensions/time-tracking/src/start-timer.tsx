import {
  LaunchProps,
  ActionPanel,
  Action,
  List,
  Form,
  Icon,
  popToRoot,
  closeMainWindow,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  startTimer,
  stopTimer,
  deleteTimer,
  editTimer,
  getTimers,
  runningTimerId,
  getDuration,
  formatDuration,
  Timer,
} from "./Timers";

interface LongSessionInfo {
  timer: Timer;
  timerId: string;
  duration: number;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.StartTimer }>) {
  const [longSession, setLongSession] = useState<LongSessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  let name = props.arguments.name;
  if (name?.trim().length === 0) {
    name = "Unnamed timer";
  }
  const tag = props.arguments.tag;

  const { longSessionCheck, longSessionThreshold } = getPreferenceValues<Preferences.StartTimer>();

  useEffect(() => {
    (async () => {
      const currentTimerId = await runningTimerId();

      if (currentTimerId && longSessionCheck) {
        const timers = await getTimers();
        const currentTimer = timers[currentTimerId];

        if (currentTimer) {
          const thresholdMs = parseInt(longSessionThreshold || "3600000");
          const duration = getDuration(currentTimer);

          if (duration >= thresholdMs) {
            setLongSession({ timer: currentTimer, timerId: currentTimerId, duration });
            setIsLoading(false);
            return;
          }
        }
      }

      // Normal flow — start timer and close immediately
      const timer = await startTimer(name, tag);
      await closeMainWindow();
      await showHUD(`Started ${timer?.name || name}`);
      await popToRoot();
    })();
  }, []);

  if (isLoading || !longSession) {
    return <List isLoading={true} />;
  }

  const prevName = longSession.timer.name || "Unnamed timer";
  const formattedDuration = formatDuration(longSession.duration);

  async function handleKeep() {
    const timer = await startTimer(name, tag);
    await closeMainWindow();
    await showHUD(`Kept "${prevName}" (${formattedDuration}). Started ${timer?.name || name}`);
    await popToRoot();
  }

  async function handleCancel() {
    await deleteTimer(longSession!.timerId);
    const timer = await startTimer(name, tag);
    await closeMainWindow();
    await showHUD(`Cancelled "${prevName}". Started ${timer?.name || name}`);
    await popToRoot();
  }

  return (
    <List searchBarPlaceholder={`"${prevName}" has been running for ${formattedDuration}`}>
      <List.Item
        title="Keep Full Duration"
        subtitle={`Keep ${formattedDuration} for "${prevName}"`}
        icon={Icon.Checkmark}
        actions={
          <ActionPanel>
            <Action title="Keep Time" onAction={handleKeep} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Cancel Previous Timer"
        subtitle={`Delete "${prevName}" entirely`}
        icon={Icon.Trash}
        actions={
          <ActionPanel>
            <Action title="Cancel Timer" onAction={handleCancel} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Update End Time"
        subtitle={`Adjust when "${prevName}" actually ended`}
        icon={Icon.Clock}
        actions={
          <ActionPanel>
            <Action.Push
              title="Update End Time"
              target={<UpdateEndTimeForm previousTimer={longSession.timer} newTimerName={name} newTimerTag={tag} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function UpdateEndTimeForm({
  previousTimer,
  newTimerName,
  newTimerTag,
}: {
  previousTimer: Timer;
  newTimerName: string;
  newTimerTag?: string;
}) {
  async function handleSubmit(values: { endTime: Date; endTimeOverride: string }) {
    let endMs: number;

    if (values.endTimeOverride?.trim()) {
      const parsed = new Date(values.endTimeOverride.trim().replace(" ", "T"));
      if (isNaN(parsed.getTime())) {
        await showHUD("Invalid date format. Use yyyy-mm-dd hh:mm");
        return;
      }
      endMs = parsed.getTime();
    } else {
      endMs = values.endTime.getTime();
    }

    // Stop the running timer (sets end=now, clears running ref)
    await stopTimer();
    // Overwrite the end time with the user's chosen time
    const updated = await editTimer({ ...previousTimer, end: endMs });
    if (!updated) {
      await showHUD("End time must be after the timer's start time");
      return;
    }
    // Start the new timer (stopTimer inside is a no-op now)
    const timer = await startTimer(newTimerName, newTimerTag);
    await closeMainWindow();
    await showHUD(
      `Updated "${previousTimer.name || "Unnamed timer"}" end time. Started ${timer?.name || newTimerName}`,
    );
    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update End Time" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="endTime" title="End Time" defaultValue={new Date()} type={Form.DatePicker.Type.DateTime} />
      <Form.TextField
        id="endTimeOverride"
        title="Or Type Date"
        placeholder="yyyy-mm-dd hh:mm"
        info="If filled, this overrides the date picker above"
      />
    </Form>
  );
}
