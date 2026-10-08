import { Action, ActionPanel, Clipboard, Form, openExtensionPreferences } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { validateAndGetPreferences } from "./preferences-utils";
import { switchLanguage } from "./common";
import { useState } from "react";

export default function FixLanguage() {
  const [result, setResult] = useState<string>("");
  const preferences = validateAndGetPreferences();

  if (!preferences) {
    return;
  }

  const { handleSubmit, itemProps } = useForm({
    onSubmit: async (values) => {
      const mappedSelectedText = switchLanguage(values.input);
      Clipboard.paste(mappedSelectedText);
    },
  });

  const handleChange = (e: string) => {
    if (e.length > 1) {
      const mappedText = switchLanguage(e);
      setResult(mappedText);
    } else {
      setResult("");
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Paste to Active App" onSubmit={handleSubmit} />
          {result && (
            <Action
              title="Copy Result"
              onAction={() => Clipboard.copy(result)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          <Action title="Open Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" onChange={handleChange} {...itemProps} />
      {result && <Form.TextArea id="result" title="Result" value={result} onChange={() => {}} />}
    </Form>
  );
}
