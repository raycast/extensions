import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { countLetters, MAX_LETTERS } from "./compose";

type Props = {
  initialName?: string;
  initialSpacing?: number;
  onSubmit: (values: { name: string; spacing: number }) => void | Promise<void>;
  submitTitle?: string;
};

export function NameForm({ initialName = "", initialSpacing = 0, onSubmit, submitTitle = "Generate" }: Props) {
  const { pop } = useNavigation();
  const [value, setValue] = useState(initialName);
  const [spacing, setSpacing] = useState(String(initialSpacing));
  const [nameError, setNameError] = useState<string | undefined>();
  const [spacingError, setSpacingError] = useState<string | undefined>();

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
              const parsedSpacing = Number.parseInt(spacing || "0", 10);
              if (!Number.isFinite(parsedSpacing) || parsedSpacing < 0) {
                setSpacingError("Spacing must be a non-negative number");
                return;
              }
              await onSubmit({ name: value, spacing: parsedSpacing });
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
      <Form.TextField
        id="spacing"
        title="Image Spacing (px)"
        placeholder="0"
        value={spacing}
        error={spacingError}
        onChange={(v) => {
          setSpacing(v);
          if (spacingError) setSpacingError(undefined);
        }}
      />
    </Form>
  );
}
