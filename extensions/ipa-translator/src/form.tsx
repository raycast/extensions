import { ActionPanel, Action, Form } from "@raycast/api";
import { useState } from "react";
import { Languages } from "./types";
import { getTranslation } from "./util";

export const CustomForm = ({ language, accentSwitch }: { language: Languages; accentSwitch?: boolean }) => {
  const [text, setText] = useState("");
  const [includeAccents, setIncludeAccents] = useState(true);
  const [translated, setTranslated] = useState("");

  const handleSubmit = (textToTranslate: string, accents: boolean) => {
    setTranslated(getTranslation(textToTranslate, language, accents));
  };

  const onTextChange = (newValue: string) => {
    setText(newValue);
    handleSubmit(newValue, includeAccents);
  };

  const onAccentsChange = (newValue: boolean) => {
    setIncludeAccents(newValue);
    handleSubmit(text, newValue);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Translated IPA" content={translated} />
          <Action.CopyToClipboard title="Copy Original Text" content={text} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Write something in plain ${language} and watch it being converted to IPA.`} />
      <Form.TextArea
        id="textarea"
        title={`${language} input`}
        placeholder="Enter or paste text"
        onChange={onTextChange}
      />
      {accentSwitch && (
        <Form.Checkbox
          id="accents"
          label="Include accents"
          storeValue
          value={includeAccents}
          onChange={onAccentsChange}
        />
      )}
      <Form.Separator />
      <Form.Description title="Translated IPA" text={translated} />
    </Form>
  );
};
