import {
  showToast,
  ActionPanel,
  Icon,
  Form,
  Action,
  Toast,
} from '@raycast/api';
import {
  getCurrentTimestamp,
  getDate,
  getRelativeTime,
  toDateString,
} from './utils';

interface Form {
  timestamp: string;
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
      <Form.TextField id="timestamp" title="Timestamp" />
    </Form>
  );
}

function ConvertAction() {
  async function handleSubmit(values: Form) {
    const { timestamp } = values;
    if (timestamp.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Empty input',
      });
      return;
    }
    const value = parseInt(timestamp);
    if (isNaN(value)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid value',
      });
      return;
    }
    if (value < 0) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Negative value',
      });
      return;
    }
    if (value > 8640000000000) {
      showToast({
        style: Toast.Style.Failure,
        title: 'The value is too high',
      });
      return;
    }
    const date = getDate(value);
    const dateString = toDateString(date);

    const now = getDate(getCurrentTimestamp());
    const relative = getRelativeTime(date, now);

    const text = `${dateString} (${relative})`;

    showToast({
      style: Toast.Style.Success,
      title: text,
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
