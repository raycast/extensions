import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";

export function UrlInput({
  title,
  initialValue = "",
  onSubmit,
}: {
  title?: string;
  initialValue?: string;
  onSubmit: (url: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Continue"
            onSubmit={() => {
              try {
                const input = value.trim();
                new URL(input);
                onSubmit(input);
              } catch (cause) {
                setError((cause as Error).message);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="url"
        title="URL"
        value={value}
        placeholder="https://example.com or myapp://page"
        onChange={(text) => {
          setValue(text);
          setError(undefined);
        }}
        error={error}
      />
    </Form>
  );
}
