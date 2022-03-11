import {
  showToast,
  ActionPanel,
  Icon,
  Form,
  Action,
  Clipboard,
  Toast,
} from '@raycast/api';
import { getTimestamp, toDate } from './utils';

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

    const yearNumber = parseInt(year || '0');
    const monthNumber = parseInt(month || '0');
    const dayNumber = parseInt(day || '0');
    const hoursNumber = parseInt(hours || '0');
    const minutesNumber = parseInt(minutes || '0');
    const secondsNumber = parseInt(seconds || '0');

    if (isNaN(yearNumber)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid field value: "Year"',
      });
      return;
    }
    if (isNaN(monthNumber)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid field value: "Month"',
      });
      return;
    }
    if (isNaN(dayNumber)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid field value: "Day"',
      });
      return;
    }
    if (isNaN(hoursNumber)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid field value: "Hours"',
      });
      return;
    }
    if (isNaN(minutesNumber)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid field value: "Minutes"',
      });
      return;
    }
    if (isNaN(secondsNumber)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid field value: "Seconds"',
      });
      return;
    }

    const date = toDate(
      yearNumber,
      monthNumber,
      dayNumber,
      hoursNumber,
      minutesNumber,
      secondsNumber,
    );
    const timestamp = getTimestamp(date);

    Clipboard.copy(timestamp.toString());
    showToast({
      style: Toast.Style.Success,
      title: 'Copied to clipboard',
    });
  }

  return (
    <Action.SubmitForm
      icon={Icon.Checkmark}
      title="Convert"
      onSubmit={handleSubmit}
    />
  );
}
