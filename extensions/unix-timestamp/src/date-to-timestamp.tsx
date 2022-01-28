import { showToast, ActionPanel, Icon, SubmitFormAction, Form, ToastStyle, copyTextToClipboard } from "@raycast/api";
import { getTimestamp, toDate } from "./utils";

interface Form {
  year: string;
  month: string;
  day: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export default function main() {
  return (
    <Form
      actions={
        <ActionPanel>
          <ConvertAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="year" title="Year" />
      <Form.TextField id="month" title="Month" />
      <Form.TextField id="day" title="Day" />
      <Form.TextField id="hours" title="Hours" />
      <Form.TextField id="minutes" title="Minutes" />
      <Form.TextField id="seconds" title="Seconds" />
    </Form>
  );
}

function ConvertAction() {
  async function handleSubmit(values: Form) {
    const { year, month, day, hours, minutes, seconds } = values;

    const yearNumber = parseInt(year || "0");
    const monthNumber = parseInt(month || "0");
    const dayNumber = parseInt(day || "0");
    const hoursNumber = parseInt(hours || "0");
    const minutesNumber = parseInt(minutes || "0");
    const secondsNumber = parseInt(seconds || "0");

    if (isNaN(yearNumber)) {
      showToast(ToastStyle.Failure, 'Invalid field value: "Year"');
      return;
    }
    if (isNaN(monthNumber)) {
      showToast(ToastStyle.Failure, 'Invalid field value: "Month"');
      return;
    }
    if (isNaN(dayNumber)) {
      showToast(ToastStyle.Failure, 'Invalid field value: "Day"');
      return;
    }
    if (isNaN(hoursNumber)) {
      showToast(ToastStyle.Failure, 'Invalid field value: "Hours"');
      return;
    }
    if (isNaN(minutesNumber)) {
      showToast(ToastStyle.Failure, 'Invalid field value: "Minutes"');
      return;
    }
    if (isNaN(secondsNumber)) {
      showToast(ToastStyle.Failure, 'Invalid field value: "Seconds"');
      return;
    }

    const date = toDate(yearNumber, monthNumber, dayNumber, hoursNumber, minutesNumber, secondsNumber);
    const timestamp = getTimestamp(date);

    copyTextToClipboard(timestamp.toString());
    showToast(ToastStyle.Success, "Copied to clipboard");
  }

  return <SubmitFormAction icon={Icon.Checkmark} title="Convert" onSubmit={handleSubmit} />;
}
