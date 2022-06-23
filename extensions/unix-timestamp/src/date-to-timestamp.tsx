import {
  showToast,
  ActionPanel,
  Icon,
  Form,
  Action,
  Clipboard,
  Toast,
} from '@raycast/api';
import {
  DateValidationError,
  getTimestamp,
  toDate,
  validateDateInput,
} from './utils';

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

    const validatationError = validateDateInput(
      yearNumber,
      monthNumber,
      dayNumber,
      hoursNumber,
      minutesNumber,
      secondsNumber,
    );

    if (validatationError) {
      const title = getValidationErrorText(validatationError);
      showToast({
        style: Toast.Style.Failure,
        title,
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

function getValidationErrorText(validatationError: DateValidationError) {
  const { error, field } = validatationError;

  let errorText = '';
  switch (error) {
    case 'not-a-number':
      errorText = 'Not a number';
      break;
    case 'negative':
      errorText = 'Negative value';
      break;
    case 'out-of-bounds':
      errorText = 'The value is too high';
      break;
    default:
      errorText = 'Unknown error';
      break;
  }

  let fieldText = '';
  switch (field) {
    case 'year':
      fieldText = 'Year';
      break;
    case 'month':
      fieldText = 'Month';
      break;
    case 'day':
      fieldText = 'Day';
      break;
    case 'hours':
      fieldText = 'Hours';
      break;
    case 'minutes':
      fieldText = 'Minutes';
      break;
    case 'seconds':
      fieldText = 'Seconds';
      break;
  }

  return `${errorText}: "${fieldText}"`;
}
