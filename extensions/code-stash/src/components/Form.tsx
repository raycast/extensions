import { useCallback, useState, useRef } from "react";
import { Form, Action, ActionPanel, useNavigation, Toast, showToast } from "@raycast/api";
import { Language, CodeStash } from "../types";
import { nanoid } from "nanoid";

import detectLang from "lang-detector";

type Props = {
  codeStash?: CodeStash;
  defaultTitle?: string;
  onSave: (title: string, code: string, language: string, id: string) => void;
};

function CodeForm({ codeStash, defaultTitle, onSave }: Props) {
  const { pop } = useNavigation();
  const [detectedLanguage, setDetectedLanguage] = useState<string>(codeStash?.language ?? "JavaScript");
  const dropdownRef = useRef<Form.Dropdown>(null);

  const handleValidationError = async () => {
    await showToast({
      title: "There was an error",
      message: "Title and Code must have values",
      style: Toast.Style.Failure,
    });
  };

  const isEmpty = (value: string) => value.trim().length === 0;

  const handleSubmit = useCallback(
    (values: { title: string; code: string; language: string }) => {
      const { title, code, language } = values;
      if (isEmpty(title) || isEmpty(code)) {
        return handleValidationError();
      }

      const id = codeStash?.id ?? nanoid();

      onSave(title, code, language, id);
      pop();
    },
    [onSave, pop]
  );

  const handleCodeInput = (value: string) => {
    const language = detectLang(value);
    setDetectedLanguage(language);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        defaultValue={codeStash?.title ?? defaultTitle}
        title="Title"
        placeholder="Hello world"
      />

      <Form.TextArea
        id="code"
        title="Code"
        placeholder="console.log('Hello world')"
        defaultValue={codeStash?.code}
        onChange={(value) => handleCodeInput(value)}
      />

      <Form.Dropdown
        id="language"
        title="Language"
        value={detectedLanguage}
        ref={dropdownRef}
        info="We will try our best to dectect the programming langauge for you"
        onChange={(language) => setDetectedLanguage(language)}
      >
        <Form.Dropdown.Item value="Unknown" title="Unknown" />
        {Object.values(Language).map(
          (language, index) =>
            language !== "All" && <Form.Dropdown.Item key={index} value={language} title={language} />
        )}
      </Form.Dropdown>
    </Form>
  );
}

export default CodeForm;
