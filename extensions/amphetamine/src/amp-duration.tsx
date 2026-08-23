import { useEffect, useState } from "react";
import type { ComponentProps, ComponentType } from "react";
import { Form, ActionPanel, Action, Toast, popToRoot, Icon } from "@raycast/api";
import ampStart from "./amp-start";
import { formatDateTime, getSessionTime } from "./session-time";

/** Next whole minute; used as DatePicker `min` so only future times are valid (and built-in "Now" is typically omitted). */
function getMinimumUntilDate(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 1, 0, 0);
  return d;
}

type DatePickerWithMinProps = ComponentProps<typeof Form.DatePicker> & { min?: Date };

const DatePickerWithMin = Form.DatePicker as ComponentType<DatePickerWithMinProps>;

enum Intervals {
  minutes = "minutes",
  hours = "hours",
}

enum DefaultDuration {
  minutes = "30",
  hours = "1",
}

enum SessionType {
  duration = "duration",
  time = "time",
}

export default function SessionWithDuration() {
  const [sessionType, setSessionType] = useState<SessionType>(SessionType.duration);
  const [interval, setDurationUnit] = useState<keyof typeof Intervals>(Intervals.minutes);
  const [duration, setDuration] = useState<string>(DefaultDuration.minutes);
  const [target, setTarget] = useState<Date | null>(null);
  const [targetError, setTargetError] = useState<string | undefined>();
  const [earliestTarget, setEarliestTarget] = useState(getMinimumUntilDate);

  useEffect(() => {
    if (sessionType !== SessionType.time) return;

    const refreshEarliestTarget = () => setEarliestTarget(getMinimumUntilDate());
    refreshEarliestTarget();
    const intervalId = setInterval(refreshEarliestTarget, 60_000);

    return () => clearInterval(intervalId);
  }, [sessionType]);

  function validateTarget(value: Date | null) {
    const parsed = value ? getSessionTime(value) : undefined;
    setTargetError(parsed ? undefined : "Choose a future date and time.");
    return parsed;
  }

  const parsedTime = target ? getSessionTime(target) : undefined;
  const timeInfo = parsedTime
    ? `Starts a session until ${formatDateTime(parsedTime.target)}.`
    : "Choose a future date and time.";

  const toast = new Toast({
    title: "Starting New Session",
    style: Toast.Style.Animated,
  });

  async function submit() {
    toast.show();

    if (sessionType === SessionType.time) {
      const parsed = validateTarget(target);
      if (!parsed) {
        toast.title = "Failed to initialize a session.";
        toast.message = "Choose a future date and time.";
        toast.style = Toast.Style.Failure;
        return;
      }

      const started = await ampStart({ duration: parsed.durationMinutes, interval: Intervals.minutes });
      if (started) popToRoot();
      return;
    }

    const convertedDuration = Number(duration);
    if (Number.isNaN(convertedDuration)) {
      toast.title = "Failed to initialize a session.";
      toast.message = "The duration is invalid";
      toast.style = Toast.Style.Failure;
    } else {
      let started = false;
      if (!duration) {
        started = await ampStart();
      } else {
        started = await ampStart({ duration: convertedDuration, interval });
      }
      if (started) popToRoot();
    }
  }

  function handleChangeDuration(newInterval: keyof typeof Intervals) {
    if (interval !== newInterval) {
      setDurationUnit(newInterval);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Session" onSubmit={submit} icon={Icon.List} />
          {sessionType === SessionType.duration ? (
            <>
              <Action
                title="Select Hours"
                onAction={() => handleChangeDuration(Intervals.hours)}
                shortcut={{ key: "h", modifiers: ["cmd"] }}
                icon={Icon.Clock}
              />
              <Action
                title="Select Minutes"
                onAction={() => handleChangeDuration(Intervals.minutes)}
                shortcut={{ key: "m", modifiers: ["cmd"] }}
                icon={Icon.Clock}
              />
            </>
          ) : null}
        </ActionPanel>
      }
      navigationTitle="Configure Session"
    >
      <Form.Dropdown
        id="sessionType"
        title="Session Type"
        value={sessionType}
        storeValue
        onChange={(value) => setSessionType(value as SessionType)}
      >
        <Form.Dropdown.Item value={SessionType.duration} title="For Duration" />
        <Form.Dropdown.Item value={SessionType.time} title="Until Time" />
      </Form.Dropdown>
      {sessionType === SessionType.duration ? (
        <>
          <Form.TextField
            id="duration"
            title={`Duration (in ${interval})`}
            info={`Sets the session duration based on the unit selected.\n\nCurrent: ${duration} ${
              duration === "1" ? interval.substring(0, interval.length - 1) : interval
            }`}
            storeValue
            onChange={(value) => setDuration(value)}
          />
          <Form.Dropdown
            id="interval"
            title="Unit"
            storeValue
            info={`Select whether the duration should be in minutes or in hours.\n\n- Changing the duration to hours will set a default value of 1 hour.\n- Changing the duration to minutes will set a default value of 30 minutes`}
            onChange={(value) => handleChangeDuration(value as keyof typeof Intervals)}
          >
            <Form.Dropdown.Item value="minutes" title="minutes" />
            <Form.Dropdown.Item value="hours" title="hours" />
          </Form.Dropdown>
        </>
      ) : sessionType === SessionType.time ? (
        <DatePickerWithMin
          id="target"
          title="Until"
          value={target}
          type={Form.DatePicker.Type.DateTime}
          min={earliestTarget}
          info={timeInfo}
          error={targetError}
          onChange={(value) => {
            setTarget(value);
            validateTarget(value);
          }}
          onBlur={(event) => validateTarget(event.target.value ?? null)}
        />
      ) : null}
    </Form>
  );
}
