import { Form, ActionPanel, Action, Clipboard, showToast, Toast, getPreferenceValues, Icon } from "@raycast/api";
import got from "got";
import { useEffect, useState } from "react";
import { source_languages, target_languages } from "./utils";

interface Values {
  key?: string;
  from?: string;
  to?: string;
  text?: string;
  translation?: string;
}

interface Preferences {
  key: string;
  pro: boolean;
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

const Command = () => {
  const [key, setKey] = useState("");
  const [pro, setPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [translation, setTranslation] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("EN");

  useEffect(() => {
    (async () => {
      const preferences: Preferences = getPreferenceValues();
      setKey(preferences.key);
      setPro(preferences.pro);
    })();
  }, []);

  const submit = async (values: Values) => {
    if (values.text) {
      try {
        setLoading(true);
        console.log(
          `https://api${pro ? "" : "-free"}.deepl.com/v2/translate?auth_key=${key}&text=${values.text}&target_lang=${
            values.to
          }${values.from ? `&source_lang=${values.from}` : ""}`
        );
        const response = await got(
          `https://api${pro ? "" : "-free"}.deepl.com/v2/translate?auth_key=${key}&text=${values.text}&target_lang=${
            values.to
          }${values.from ? `&source_lang=${values.from}` : ""}`
        );
        const translation = JSON.parse(response.body).translations[0].text;
        setLoading(false);
        setTranslation(translation);
        await Clipboard.copy(translation);
        await showToast(Toast.Style.Success, "The translation was copied to your clipboard.");
      } catch (error) {
        setLoading(false);
        await showToast(
          Toast.Style.Failure,
          "Something went wrong",
          "Check your internet connection, API key, or you've maxed out the API."
        );
      }
    }
  };

  const switchLanguages = async () => {
    // No action if the source language is not set ("Detect" by default)
    if (sourceLanguage === "") {
      await showToast(
        Toast.Style.Failure,
        "Source language not set",
        "Please select a source language before switching languages."
      );
      return;
    }

    // Slicing to handle cases such as "EN-GB", "EN-US", "PT-PT", "PT-BR", ...
    const newSourceValue = targetLanguage.slice(0, 2);
    // Picking the first occurrence of a target language that starts with the source language (always 2 chars)
    const newTargetValue = Object.keys(target_languages).find((key) => key.startsWith(sourceLanguage));

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
        <Form.Dropdown id="from" value={sourceLanguage} onChange={setSourceLanguage} storeValue={true} title="From">
          <Form.Dropdown.Item value="" title="Detect" />
          {Object.entries(source_languages).map(([value, title]) => (
            <Form.Dropdown.Item value={value} title={title} key={value} />
          ))}
        </Form.Dropdown>
        <Form.Separator />
        <Form.Dropdown id="to" value={targetLanguage} onChange={setTargetLanguage} storeValue={true} title="To">
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
