import {
  showToast,
  ActionPanel,
  Icon,
  Form,
  Action,
  Toast,
  LaunchProps,
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

export default function main(props: LaunchProps) {
  const defaultValue = props.arguments?.timestamp;
  return (
    <Form
      actions={
        <ActionPanel>
          <ConvertAction defaultValue={defaultValue} />
        </ActionPanel>
      }
    >
      <Form.TextField id="timestamp" title="Timestamp" defaultValue={defaultValue} />
    </Form>
  );
}

function ConvertAction(props: { defaultValue?: string }) {
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

  if (props?.defaultValue?.length) {
    handleSubmit({ timestamp: props.defaultValue });
  }

  return (
    <Action.SubmitForm
      icon={Icon.Checkmark}
      title="Convert"
      onSubmit={handleSubmit}
    />
  );
}
