import { ActionPanel, Action, Form, Icon } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { Activity } from "../types";
import { editActivity, toggleActivity } from "../api";
import { parseHours, secondsParser, timeDelta, validateTime } from "../utils";

interface ActivityTimerEditProps {
  activity: Activity;
  onSubmitted: () => Promise<void>;
}

// Current time of the activity as "h:mm", including the running part of a timer.
const currentTime = (activity: Activity): string => {
  const seconds = activity.seconds + (activity.timer_started_at !== null ? timeDelta(activity.timer_started_at) : 0);
  const time = secondsParser(seconds);
  return time.slice(0, time.lastIndexOf(":"));
};

// Edits description and time. The date stays untouched.
// MOCO does not document how a running timer reacts to a time change, so a running timer is stopped,
// updated and started again. Without a time change the timer is not touched.
export const ActivityTimerEdit: React.FC<ActivityTimerEditProps> = ({ activity, onSubmitted }) => {
  const [initialTime] = useState<string>(currentTime(activity));
  const isRunning = activity.timer_started_at !== null;

  const { handleSubmit, itemProps } = useForm<{ description: string; time: string }>({
    initialValues: { description: activity.description, time: initialTime },
    validation: {
      description: FormValidation.Required,
      time: (value) => (value?.trim() ? validateTime(value) : "The field shouldn't be empty!"),
    },
    onSubmit: async (values) => {
      const time = values.time.trim();
      if (time === initialTime) {
        if ((await editActivity({ description: values.description }, activity.id)) === true) {
          await onSubmitted();
        }
        return;
      }

      if (isRunning && (await toggleActivity(activity.id, false)) !== true) {
        return;
      }
      const success = await editActivity({ description: values.description, hours: parseHours(time) }, activity.id);
      if (isRunning) {
        await toggleActivity(activity.id, true);
      }
      if (success === true) {
        await onSubmitted();
      }
    },
  });

  return (
    <Form
      navigationTitle={`${activity.project.name}/${activity.task.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Pencil} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Description" {...itemProps.description} />
      <Form.TextField
        title={isRunning ? "Time (running)" : "Time"}
        placeholder="h:mm"
        info={
          isRunning ? "Changing the time stops the timer, saves the new time and starts the timer again." : undefined
        }
        {...itemProps.time}
      />
    </Form>
  );
};
