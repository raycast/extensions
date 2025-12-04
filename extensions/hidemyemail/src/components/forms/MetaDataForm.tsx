import { Form, Action, ActionPanel, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

const MAX_LENGTH_NOTE = 2048;
const MAX_LENGTH_LABEL = 256;

export function MetaDataForm({
  type,
  currentValue,
  onSubmit,
}: {
  type: string;
  currentValue: string;
  onSubmit: (newLabel: string) => void;
}) {
  const [value, setValue] = useState(currentValue);
  const [error, setError] = useState<string | undefined>(undefined);
  const { pop } = useNavigation();

  function onChange(newValue: string) {
    setValue(newValue);
    setError(undefined);
  }

  async function handleSubmit() {
    if (type === "Label" && value.trim() === "") {
      await showToast({ style: Toast.Style.Failure, title: "Label cannot be empty" });
      return;
    }

    if (type === "Label" && value.length > MAX_LENGTH_LABEL) {
      setError(`Max ${MAX_LENGTH_LABEL} characters`);
      return;
    }

    if (type === "Note" && value.length > MAX_LENGTH_NOTE) {
      setError(`Max ${MAX_LENGTH_NOTE} characters`);
      return;
    }

    onSubmit(value);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="value" title={`New ${type}`} value={value} onChange={onChange} error={error} />
    </Form>
  );
}
