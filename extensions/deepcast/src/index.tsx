import { Form, ActionPanel, Action, showToast, Toast, Icon, LaunchProps, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  Formality,
  SUPPORTED_FORMALITY_LANGUAGES,
  SourceLanguage,
  TargetLanguage,
  getSelection,
  sendTranslateRequest,
  source_languages,
  target_languages,
} from "./utils";
import TranslationView from "./components/TranslationView";
import transliterate from "@sindresorhus/transliterate";

interface Values {
  key?: string;
  from?: SourceLanguage | "";
  to?: TargetLanguage;
  text?: string;
  translation?: string;
  formality?: Formality;
}

function SwitchLanguagesAction(props: { onSwitchLanguages: () => void }) {
  return (
    <Action
      icon={Icon.Switch}
      title="Switch Languages"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onSwitchLanguages}
    />
  );
}

type LaunchContext = {
  translation?: string;
  sourceLanguage?: SourceLanguage;
};

const Command = (props: LaunchProps<{ launchContext?: LaunchContext }>) => {
  // Check whether component is called with an existing value for translation
  if (props?.launchContext?.translation) {
    const translation = props?.launchContext?.translation;
    const sourceLanguage = props?.launchContext?.sourceLanguage;
    return <TranslationView translation={translation} sourceLanguage={sourceLanguage} />;
  }
  const { defaultTargetLanguage, showTransliteration, showFormalityConfig } = getPreferenceValues<Preferences>();
  const [loading, setLoading] = useState(false);
  const [sourceText, setSourceText] = useState(props.fallbackText ?? "");
  const [translation, setTranslation] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage | "">("");
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(defaultTargetLanguage);
  const [detectedSourceLanguage, setDetectedSourceLanguage] = useState<SourceLanguage>();
  const [formality, setFormality] = useState<Formality>("default");

  // set the source text to the selected text if no fallback text is provided
  // if there is no selected text, then just leave the source text empty
  useEffect(() => {
    if (props.fallbackText) return;
    getSelection().then((content) => {
      setSourceText(content ?? "");
    });
  }, []);

  const submit = async (values: Values) => {
    if (!values.text || !values.to) return;
    setLoading(true);

    const response = await sendTranslateRequest({
      text: values.text,
      targetLanguage: values.to,
      sourceLanguage: values.from && values.from.length > 0 ? values.from : undefined,
      onTranslateAction: "none",
      formality: values.formality ?? "default",
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
        "Please select a source language before switching languages.",
      );
      return;
    }

    // Slicing to handle cases such as "EN-GB", "EN-US", "PT-PT", "PT-BR", ...
    const newSourceValue = targetLanguage.slice(0, 2) as SourceLanguage;
    // Picking the first occurrence of a target language that starts with the source language (always 2 chars)
    const newTargetValue = Object.keys(target_languages).find((key) =>
      key.startsWith(detectedSourceLanguage || sourceLanguage),
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
        `Could not switch between ${sourceLanguage} and ${targetLanguage}`,
      );
    }
  };

  const _t = transliterate(translation);
  const transliteration = _t == translation ? "" : _t;

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm icon={Icon.ArrowRightCircle} title="Translate" onSubmit={submit} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Translation"
              shortcut={{ modifiers: ["cmd"], key: "." }}
              content={translation}
            />
            <Action.Paste
              title="Paste in Frontmost App"
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              content={translation}
            />
            <Action.CopyToClipboard
              title="Copy Transliteration"
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              content={transliteration}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Free API Key" url="https://www.deepl.com/pro-api" />
            <SwitchLanguagesAction onSwitchLanguages={switchLanguages} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={loading}
    >
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
      {SUPPORTED_FORMALITY_LANGUAGES.includes(targetLanguage) && showFormalityConfig && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="formality"
            value={formality}
            onChange={(value) => setFormality(value as Formality)}
            storeValue={true}
            title="Formality"
          >
            <Form.Dropdown.Item value="default" title="Default" />
            <Form.Dropdown.Item value="prefer_more" title={(targetLanguage === "JA" && "Polite") || "More Formal"} />
            <Form.Dropdown.Item value="prefer_less" title={(targetLanguage === "JA" && "Plain") || "Less Formal"} />
          </Form.Dropdown>
        </>
      )}
      <Form.TextArea id="translation" value={translation} />
      {(showTransliteration == "always" || (showTransliteration == "whenProvided" && transliteration.length > 0)) && (
        <>
          <Form.TextArea id="translation" value={translation} />
          <Form.Description title="Transliteration" text={transliteration} />
        </>
      )}
    </Form>
  );
};

export default Command;
