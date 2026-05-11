import { useState } from "react";
import { Form, ActionPanel, Action, Toast, popToRoot, Icon } from "@raycast/api";
import ampStart from "./amp-start";

enum Intervals {
  minutes = "minutes",
  hours = "hours",
}

enum DefaultDuration {
  minutes = "30",
  hours = "1",
}

export default function SessionWithDuration() {
  const [interval, setInterval] = useState<keyof typeof Intervals>(Intervals.minutes);
  const [duration, setDuration] = useState<string>(DefaultDuration.minutes);

  const toast = new Toast({
    title: "Starting New Session",
    style: Toast.Style.Animated,
  });

  async function submit() {
    toast.show();

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
      setInterval(newInterval);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Session" onSubmit={submit} icon={Icon.List} />
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
        </ActionPanel>
      }
      navigationTitle="Configure Session"
    >
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
    </Form>
  );
}
