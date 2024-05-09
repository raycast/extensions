import { ActionPanel, Action, Form } from "@raycast/api";
import { useState } from "react";
import { Languages } from "./types";
import { getTranslation, readDictionaryData } from "./util";

export const CustomForm = ({ language, accentSwitch }: { language: Languages; accentSwitch?: boolean }) => {
  const [text, setText] = useState("");
  const [includeAccents, setIncludeAccents] = useState(true);
  const [translated, setTranslated] = useState("");

  let dictionaryPlaceholder: string;
  let dictionaryPlaceholderNoAccents: string;
  switch (language) {
    case Languages.English:
      dictionaryPlaceholder = readDictionaryData("EN_dictionary.json");
      dictionaryPlaceholderNoAccents = readDictionaryData("EN_dictionary-no-accents.json");
      break;
    case Languages.Danish:
      dictionaryPlaceholder = readDictionaryData("DA_dictionary.json");
      dictionaryPlaceholderNoAccents = readDictionaryData("DA_dictionary.json");
      break;
    case Languages.German:
      dictionaryPlaceholder = readDictionaryData("DE_dictionary.json");
      dictionaryPlaceholderNoAccents = readDictionaryData("DE_dictionary.json");
      break;
    case Languages.Swedish:
      dictionaryPlaceholder = readDictionaryData("SV_dictionary.json");
      dictionaryPlaceholderNoAccents = readDictionaryData("SV_dictionary.json");
      break;
    case Languages.Czech:
      dictionaryPlaceholder = readDictionaryData("CZ_dictionary.json");
      dictionaryPlaceholderNoAccents = readDictionaryData("CZ_dictionary.json");
      break;
  }

  const handleSubmit = (textToTranslate: string, accents: boolean) => {
    setTranslated(getTranslation(textToTranslate, accents ? dictionaryPlaceholder : dictionaryPlaceholderNoAccents));
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
      <Form.TextField
        id="textarea"
        title={`${language} input`}
        placeholder="Enter or paste text"
        onChange={onTextChange}
      />
      {accentSwitch && (
        <Form.Checkbox id="accents" label="Include accents" value={includeAccents} onChange={onAccentsChange} />
      )}
      <Form.Separator />
      <Form.Description title="Translated IPA" text={translated} />
    </Form>
  );
};
