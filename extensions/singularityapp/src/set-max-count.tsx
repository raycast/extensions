import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { getMaxCount, setMaxCount, DEFAULT_MAX_COUNT } from "./api";

export default function SetMaxCount() {
  const [maxCount, setMaxCountValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    async function loadCurrentValue() {
      const currentValue = await getMaxCount();
      setMaxCountValue(String(currentValue));
      setIsLoading(false);
    }
    loadCurrentValue();
  }, []);

  function validateInput(value: string): string | undefined {
    if (!value.trim()) {
      return "Max count is required";
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      return "Please enter a valid number";
    }
    if (num < 1) {
      return "Max count must be at least 1";
    }
    if (num > 10000) {
      return "Max count should not exceed 10000 to avoid performance issues";
    }
    return undefined;
  }

  async function handleSubmit(values: { maxCount: string }) {
    const validationError = validateInput(values.maxCount);
    if (validationError) {
      setError(validationError);
      return;
    }

    const num = parseInt(values.maxCount, 10);
    await setMaxCount(num);

    await showToast({
      style: Toast.Style.Success,
      title: "Max Count Updated",
      message: `Tasks will now fetch up to ${num} items per request`,
    });

    popToRoot();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Max Count" onSubmit={handleSubmit} />
          <Action
            title={`Reset to Default (${DEFAULT_MAX_COUNT})`}
            onAction={async () => {
              setMaxCountValue(String(DEFAULT_MAX_COUNT));
              setError(undefined);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="About Max Count"
        text={`The SingularityApp API does not support pagination or server-side filtering/sorting by date. To work around this limitation, we fetch a large batch of tasks and filter them locally.

The max count setting controls how many tasks are fetched in each API request. A higher value ensures you see all your tasks but may slow down loading times.

Default: ${DEFAULT_MAX_COUNT} tasks`}
      />
      <Form.TextField
        id="maxCount"
        title="Max Count"
        placeholder={String(DEFAULT_MAX_COUNT)}
        value={maxCount}
        onChange={(value) => {
          setMaxCountValue(value);
          setError(validateInput(value));
        }}
        error={error}
        info="The maximum number of tasks to fetch per API request (1-10000)"
      />
    </Form>
  );
}
