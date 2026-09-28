import { ActionPanel, Action, Form, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { Activity } from "../types";
import { editActivity } from "../api";
import { Actions } from "./ActivityList";
import { parseHours, secondsParser, validateTime } from "../utils";

interface ActivityEditProps {
  index: number;
  activity: Activity;
  modifyActivity: (index: number, newValue: Activity, action: Actions) => void;
}

interface ActivityEditValues {
  description: string;
  date: Date | null;
  hours: string;
}

export const ActivityEdit: React.FC<ActivityEditProps> = ({ index, activity, modifyActivity }) => {
  const navigation = useNavigation();
  const loggedTime = secondsParser(activity.seconds);

  const { handleSubmit, itemProps } = useForm<ActivityEditValues>({
    initialValues: {
      description: activity.description,
      date: new Date(activity.date),
      hours: loggedTime.slice(0, loggedTime.lastIndexOf(":")),
    },
    validation: {
      description: FormValidation.Required,
      hours: (value) => (value?.trim() ? validateTime(value) : "The field shouldn't be empty!"),
    },
    onSubmit: async (values) => {
      const date = (values.date ?? new Date(activity.date)).toISOString().split("T")[0];
      const hours = parseHours(values.hours);
      const success = await editActivity({ date, description: values.description, hours }, activity.id);
      if (success !== true) {
        return;
      }
      modifyActivity(index, { ...activity, date, description: values.description, hours }, Actions.update);
      navigation.pop();
    },
  });

  return (
    <Form
      navigationTitle={`Editing on ${activity.project.name}/${activity.task.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea autoFocus={false} title="Description" {...itemProps.description} />
      <Form.DatePicker title="Booking Date" {...itemProps.date} />
      <Form.TextField title="Hours Worked" {...itemProps.hours} />
    </Form>
  );
};
