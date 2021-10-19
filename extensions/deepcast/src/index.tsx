import {
  Form,
  ActionPanel,
  SubmitFormAction,
  OpenInBrowserAction,
  copyTextToClipboard,
  showToast,
  ToastStyle,
  getPreferenceValues,
} from "@raycast/api";
import got from "got";
import { useEffect, useState } from "react";

const languages = {
  BG: "Bulgarian",
  ZH: "Chinese",
  CS: "Czech",
  DA: "Danish",
  NL: "Dutch",
  EN: "English",
  ET: "Estonian",
  FI: "Finnish",
  FR: "French",
  DE: "German",
  EL: "Greek",
  HU: "Hungarian",
  IT: "Italian",
  JA: "Japanese",
  LV: "Latvian",
  LT: "Lithuanian",
  PL: "Polish",
  RO: "Romanian",
  RU: "Russian",
  SK: "Slovak",
  SL: "Slovenian",
  ES: "Spanish",
  SV: "Swedish",
};

interface Values {
  key?: string;
  from?: string;
  to?: string;
  text?: string;
  translation?: string;
}

interface Preferences {
  key: string;
}

const Command = () => {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState("");

  useEffect(() => {
    (async () => {
      const preferences: Preferences = getPreferenceValues();
      setKey(preferences.key);
    })();
  }, []);

  const submit = async (values: Values) => {
    if (values.text) {
      try {
        setLoading(true);
        const response = await got(
          `https://api-free.deepl.com/v2/translate?auth_key=${key}&text=${values.text}&target_lang=${values.to}${
            values.from ? `&source_lang=${values.from}` : ""
          }`
        );
        const translation = JSON.parse(response.body).translations[0].text;
        setLoading(false);
        setTranslation(translation);
        copyTextToClipboard(translation);
        await showToast(ToastStyle.Success, "The translation was copied to your clipboard.");
      } catch (error) {
        setLoading(false);
        await showToast(
          ToastStyle.Failure,
          "Something went wrong",
          "Check your internet connection, API key, or you've maxed out the API."
        );
      }
    }
  };
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Translate" onSubmit={submit} />
          <OpenInBrowserAction title="Free API Key" url="https://www.deepl.com/pro-api" />
        </ActionPanel>
      }
      isLoading={loading}
    >
      <>
        <Form.TextArea id="text" placeholder="Enter or paste text here" />
        <Form.Dropdown id="from" defaultValue="" storeValue={true} title="From">
          <Form.Dropdown.Item value="" title="Detect" />
          {Object.entries(languages).map(([value, title]) => (
            <Form.Dropdown.Item value={value} title={title} key={value} />
          ))}
        </Form.Dropdown>
        <Form.Separator />
        <Form.Dropdown id="to" defaultValue="EN" storeValue={true} title="To">
          {Object.entries(languages).map(([value, title]) => (
            <Form.Dropdown.Item value={value} title={title} key={value} />
          ))}
        </Form.Dropdown>
        <Form.TextArea id="translation" value={translation} />
      </>
    </Form>
  );
};
export default Command;
