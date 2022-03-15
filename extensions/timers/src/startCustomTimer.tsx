import { Action, ActionPanel, closeMainWindow, Form, popToRoot, showHUD, Toast } from "@raycast/api";
import { createCustomTimer, startTimer } from "./timerUtils";
import { Values } from "./types";

export default function CustomTimerView() {
  const handleSubmit = async (values: Values) => {
    if (isNaN(Number(values.hours))) {
      const toast = new Toast({ style: Toast.Style.Failure, title: "Hours must be a number!" });
      await toast.show();
    } else if (isNaN(Number(values.minutes))) {
      const toast = new Toast({ style: Toast.Style.Failure, title: "Minutes must be a number!" });
      await toast.show();
    } else if (isNaN(Number(values.seconds))) {
      const toast = new Toast({ style: Toast.Style.Failure, title: "Seconds must be a number!" });
      await toast.show();
    } else {
      await closeMainWindow();
      await popToRoot();
      const timerName = values.name ? values.name : "Untitled";
      const timeInSeconds = 3600 * Number(values.hours) + 60 * Number(values.minutes) + Number(values.seconds);
      await startTimer(timeInSeconds, timerName);
      if (values.willBeSaved) createCustomTimer({ name: values.name, timeInSeconds: timeInSeconds });
      await showHUD(
        `Timer "${timerName}" started for ${values.hours ? values.hours : 0}h${values.minutes ? values.minutes : 0}m${
          values.seconds ? values.seconds : 0
        }s! 🎉`
      );
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Custom Timer" onSubmit={async (values: Values) => handleSubmit(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="hours" title="Hours" placeholder="0" />
      <Form.TextField id="minutes" title="Minutes" placeholder="00" />
      <Form.TextField id="seconds" title="Seconds" placeholder="00" />
      <Form.TextField id="name" title="Name" placeholder="Pour Tea" />
      <Form.Checkbox id="willBeSaved" label="Save as preset" />
    </Form>
  );
}
