import { ActionPanel, Action, Form, useNavigation, Detail } from "@raycast/api";
import { useState } from "react";
import { Activity } from "../types";
import { editActivity } from "../api";
import { Actions } from "./ActivityList";
import { toDecimalTime, secondsParser } from "../utils";

interface ActivityEditProps {
  index: number;
  activity: Activity;
  modifyActivity: (index: number, newValue: Activity, action: Actions) => void;
}

export const ActivityEdit: React.FC<ActivityEditProps> = ({ index, activity, modifyActivity }) => {
  const navigation = useNavigation();
  const [descriptionError, setDescriptionError] = useState<string | undefined>();
  const [hoursError, setHoursError] = useState<string | undefined>();

  function dropDescriptionErrorIfNeeded() {
    if (descriptionError && descriptionError.length > 0) {
      setDescriptionError(undefined);
    }
  }

  function dropHoursErrorIfNeeded() {
    if (hoursError && hoursError.length > 0) {
      setHoursError(undefined);
    }
  }

  return (
    <Form
      navigationTitle={`Editing on ${activity.project.name}/${activity.task.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            onSubmit={(values) =>
              editActivity(
                {
                  ...values,
                  date: values.date.toISOString().split("T")[0],
                  description: values.description,
                  hours: values.hours.includes(":") ? toDecimalTime(values.hours) : values.hours,
                },
                activity.id,
              )
                .then(() =>
                  modifyActivity(
                    index,
                    {
                      ...activity,
                      date: values.date.toISOString().split("T")[0],
                      description: values.description,
                      hours: values.hours.includes(":") ? toDecimalTime(values.hours) : values.hours,
                    },
                    Actions.update,
                  ),
                )
                .then(() => navigation.pop())
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        autoFocus={false}
        id="description"
        title="Description"
        defaultValue={activity.description}
        error={descriptionError}
        onChange={dropDescriptionErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setDescriptionError("The field should't be empty!");
          } else {
            dropDescriptionErrorIfNeeded();
          }
        }}
      />
      <Form.DatePicker id="date" title="Booking Date" defaultValue={new Date(activity.date)} />
      <Form.TextField
        id="hours"
        title="Hours Worked"
        defaultValue={`${secondsParser(activity.seconds).slice(0, secondsParser(activity.seconds).lastIndexOf(":"))}`}
        error={hoursError}
        onChange={dropHoursErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setHoursError("The field should't be empty!");
          } else {
            dropHoursErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
};
