import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { countLetters, MAX_LETTERS } from "./compose";

type Props = {
  initialName?: string;
  onSubmit: (name: string) => void | Promise<void>;
  submitTitle?: string;
};

export function NameForm({ initialName = "", onSubmit, submitTitle = "Generate" }: Props) {
  const { pop } = useNavigation();
  const [value, setValue] = useState(initialName);
  const [nameError, setNameError] = useState<string | undefined>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            icon={Icon.Stars}
            onSubmit={async () => {
              const letters = countLetters(value);
              if (letters === 0) {
                setNameError("Type something…");
                return;
              }
              if (letters > MAX_LETTERS) {
                setNameError(`Max ${MAX_LETTERS} letters`);
                return;
              }
              await onSubmit(value);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter a name"
        value={value}
        error={nameError}
        onChange={(v) => {
          setValue(v);
          if (nameError) setNameError(undefined);
        }}
      />
    </Form>
  );
}
