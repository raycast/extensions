import { Action, ActionPanel, Clipboard, Form } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { switchLanguage } from "./common";
import { useState } from "react";

export default function FixLanguage() {
  const [result, setResult] = useState<string>("");

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
          <Action.SubmitForm title="Past to Code" onSubmit={handleSubmit} />
          {result && (
            <Action
              title="Copy Result"
              onAction={() => Clipboard.copy(result)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" onChange={handleChange} {...itemProps} />
      {result && <Form.TextArea id="result" title="Result" value={result} onChange={() => {}} />}
    </Form>
  );
}
