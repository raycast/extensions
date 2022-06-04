import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getPreferenceValues,
  popToRoot,
  showHUD,
  Toast,
} from "@raycast/api";
import { createCustomTimer, ensureCTFileExists, startTimer } from "./timerUtils";
import { Values } from "./types";

export default function CustomTimerView() {
  const handleSubmit = async (values: Values) => {
    await ensureCTFileExists();
    if (values.hours === "" && values.minutes === "" && values.seconds === "") {
      const toast = new Toast({ style: Toast.Style.Failure, title: "No values set for timer length!" });
      await toast.show();
    } else if (isNaN(Number(values.hours))) {
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
      const timerName = values.name ? values.name : "Untitled";
      const timeInSeconds = 3600 * Number(values.hours) + 60 * Number(values.minutes) + Number(values.seconds);
      await startTimer(timeInSeconds, timerName);
      if (values.willBeSaved) createCustomTimer({ name: values.name, timeInSeconds: timeInSeconds });
      await showHUD(
        `Timer "${timerName}" started for ${values.hours ? values.hours : 0}h${values.minutes ? values.minutes : 0}m${
          values.seconds ? values.seconds : 0
        }s! 🎉`
      );
      await popToRoot();
    }
  };

  const inputFields = [
    { id: "hours", title: "Hours", placeholder: "0" },
    { id: "minutes", title: "Minutes", placeholder: "00" },
    { id: "seconds", title: "Seconds", placeholder: "00" },
  ];
  const sortOrder = getPreferenceValues().newTimerInputOrder;
  sortOrder !== "hhmmss" ? inputFields.reverse() : inputFields;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Custom Timer" onSubmit={async (values: Values) => handleSubmit(values)} />
        </ActionPanel>
      }
    >
      {inputFields.map((item, index) => (
        <Form.TextField key={index} id={item.id} title={item.title} placeholder={item.placeholder} />
      ))}
      <Form.TextField id="name" title="Name" placeholder="Pour Tea" />
      <Form.Checkbox id="willBeSaved" label="Save as preset" />
    </Form>
  );
}
