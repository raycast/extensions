import { ActionPanel, Action, Form, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { Task } from "../../tasks/types";
import { startActivity } from "../api";

export const ActivityStart = ({ task }: { task: Task }) => {
  const [descriptionError, setDescriptionError] = useState<string | undefined>();
  const [startTimer, setStartTimer] = useState<boolean>(true);
  const navi = useNavigation();

  function dropDescriptionErrorIfNeeded() {
    if (descriptionError && descriptionError.length > 0) {
      setDescriptionError(undefined);
    }
  }

  return (
    <Form
      navigationTitle={`${task.projectName}/${task.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={startTimer ? Icon.Stopwatch : Icon.SaveDocument}
            title={`${startTimer ? "Start Timer" : "Log Work"}`}
            onSubmit={(values) =>
              startActivity({ ...values, date: values.date.toISOString().split("T")[0] }, task.projectID, task.id).then(
                () => navi.pop()
              )
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="description"
        title="Add Description"
        placeholder="Describe what you are doing"
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
      <Form.DatePicker id="date" type={Form.DatePicker.Type.Date} title="Booking Date" defaultValue={new Date()} />
      <Form.TextField
        id="hours"
        onChange={(event) => {
          if (event.length == 0) {
            setStartTimer(true);
          } else {
            setStartTimer(false);
          }
        }}
        title="Hours Worked"
        placeholder="Leaving this field empty will start a timer"
      />
    </Form>
  );
};
