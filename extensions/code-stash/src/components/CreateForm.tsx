import { useCallback, useState, useRef } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import { Language } from "../types";

import detectLang from "lang-detector";

function CreateForm(props: {
  defaultTitle?: string;
  onCreate: (title: string, code: string, language: string) => void;
}) {
  const { onCreate, defaultTitle = "" } = props;
  const { pop } = useNavigation();
  const [detectedLanguage, setDetectedLanguage] = useState<string>("JavaScript");
  const dropdownRef = useRef<Form.Dropdown>(null);

  const handleSubmit = useCallback(
    (values: { title: string; code: string; language: string }) => {
      const { title, code, language } = values;
      onCreate(title, code, language);
      pop();
    },
    [onCreate, pop]
  );

  const handleCodeInput = (value: string) => {
    const language = detectLang(value);
    setDetectedLanguage(language);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" defaultValue={defaultTitle} title="Title" placeholder="Hello world" />

      <Form.TextArea
        id="code"
        title="Code"
        placeholder="console.log('Hello world')"
        onChange={(value) => handleCodeInput(value)}
      />

      <Form.Dropdown
        id="language"
        title="Language"
        value={detectedLanguage}
        ref={dropdownRef}
        info="We will try our best to dectect the programming langauge for you"
      >
        <Form.Dropdown.Item value="Unknown" title="Unknown" />
        {Object.keys(Language).map(
          (language, index) =>
            language !== "All" && <Form.Dropdown.Item key={index} value={language} title={language} />
        )}
      </Form.Dropdown>
    </Form>
  );
}

export default CreateForm;
