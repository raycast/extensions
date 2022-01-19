import { showToast, ActionPanel, Icon, SubmitFormAction, Form, ToastStyle } from "@raycast/api";
import { getCurrentTimestamp, getDate, getRelativeTime, toDateString } from "./utils";

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
      showToast(ToastStyle.Failure, "Empty input");
      return;
    }
    const value = parseInt(timestamp);
    if (isNaN(value) || value < 0) {
      showToast(ToastStyle.Failure, "Invalid timestamp");
      return;
    }
    const date = getDate(value);
    const dateString = toDateString(date);

    const now = getDate(getCurrentTimestamp());
    const relative = getRelativeTime(date, now);

    const text = `${dateString} (${relative})`;

    showToast(ToastStyle.Success, text);
  }

  return <SubmitFormAction icon={Icon.Checkmark} title="Convert" onSubmit={handleSubmit} />;
}
