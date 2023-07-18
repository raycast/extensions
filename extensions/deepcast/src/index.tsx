import { Form, ActionPanel, Action, showToast, Toast, Icon, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { SourceLanguage, TargetLanguage, sendTranslateRequest, source_languages, target_languages } from "./utils";
import TranslationView from "./components/TranslationView";

interface Values {
  key?: string;
  from?: SourceLanguage | "";
  to?: TargetLanguage;
  text?: string;
  translation?: string;
}

function SwitchLanguagesAction(props: { onSwitchLanguages: () => void }) {
  return (
    <ActionPanel.Item
      icon={Icon.ChevronUp}
      title="Switch Languages"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onSwitchLanguages}
    />
  );
}

const Command = (props: LaunchProps) => {
  // Check whether component is called with an existing value for translation
  if (props?.launchContext?.translation) {
    return <TranslationView {...props} />;
  }

  const [loading, setLoading] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [translation, setTranslation] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage | "">("");
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>("EN-US");
  const [detectedSourceLanguage, setDetectedSourceLanguage] = useState<SourceLanguage>();

  const submit = async (values: Values) => {
    if (!values.text || !values.to) return;
    setLoading(true);

    const response = await sendTranslateRequest({
      text: values.text,
      targetLanguage: values.to,
      sourceLanguage: values.from && values.from.length > 0 ? values.from : undefined,
    });

    setLoading(false);

    if (!response) return;

    const { translation, detectedSourceLanguage } = response;

    setTranslation(translation);
    setDetectedSourceLanguage(detectedSourceLanguage);
  };

  const switchLanguages = async () => {
    // No action if the source language is not set ("Detect" by default) and we don't have a detected source language
    if (sourceLanguage === "" && !detectedSourceLanguage) {
      await showToast(
        Toast.Style.Failure,
        "Source language not set",
        "Please select a source language before switching languages."
      );
      return;
    }

    // Slicing to handle cases such as "EN-GB", "EN-US", "PT-PT", "PT-BR", ...
    const newSourceValue = targetLanguage.slice(0, 2) as SourceLanguage;
    // Picking the first occurrence of a target language that starts with the source language (always 2 chars)
    const newTargetValue = Object.keys(target_languages).find((key) =>
      key.startsWith(detectedSourceLanguage || sourceLanguage)
    ) as TargetLanguage;

    if (newTargetValue != undefined) {
      // Set the new language values
      setSourceLanguage(newSourceValue);
      setTargetLanguage(newTargetValue);
      // Switch the text content too
      const newSourceText = translation;
      const newTranslation = sourceText;
      setSourceText(newSourceText);
      setTranslation(newTranslation);
    } else {
      // Should never happen
      await showToast(
        Toast.Style.Failure,
        "Something went wrong",
        `Could not switch between ${sourceLanguage} and ${targetLanguage}`
      );
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate" onSubmit={submit} />
          <Action.OpenInBrowser title="Free API Key" url="https://www.deepl.com/pro-api" />
          <SwitchLanguagesAction onSwitchLanguages={switchLanguages} />
        </ActionPanel>
      }
      isLoading={loading}
    >
      <>
        <Form.TextArea id="text" placeholder="Enter or paste text here" value={sourceText} onChange={setSourceText} />
        <Form.Dropdown
          id="from"
          value={sourceLanguage}
          onChange={(value) => setSourceLanguage(value as SourceLanguage)}
          storeValue={true}
          title="From"
        >
          <Form.Dropdown.Item value="" title="Detect" />
          {Object.entries(source_languages).map(([value, title]) => (
            <Form.Dropdown.Item value={value} title={title} key={value} />
          ))}
        </Form.Dropdown>
        <Form.Separator />
        <Form.Dropdown
          id="to"
          value={targetLanguage}
          onChange={(value) => setTargetLanguage(value as TargetLanguage)}
          storeValue={true}
          title="To"
        >
          {Object.entries(target_languages).map(([value, title]) => (
            <Form.Dropdown.Item value={value} title={title} key={value} />
          ))}
        </Form.Dropdown>
        <Form.TextArea id="translation" value={translation} />
      </>
    </Form>
  );
};
export default Command;
