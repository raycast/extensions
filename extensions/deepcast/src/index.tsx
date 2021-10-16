import {
  Form,
  ActionPanel,
  SubmitFormAction,
  OpenInBrowserAction,
  setLocalStorageItem,
  getLocalStorageItem,
  LocalStorageValue,
  removeLocalStorageItem,
  copyTextToClipboard,
  showToast,
  ToastStyle,
} from "@raycast/api";
import got from "got";
import { useEffect, useState } from "react";

const languages = {
  BG: "Bulgarian",
  CS: "Czech",
  DA: "Danish",
  DE: "German",
  EL: "Greek",
  EN: "English",
  ES: "Spanish",
  ET: "Estonian",
  FI: "Finnish",
  FR: "French",
  HU: "Hungarian",
  IT: "Italian",
  JA: "Japanese",
  LT: "Lithuanian",
  LV: "Latvian",
  NL: "Dutch",
  PL: "Polish",
  RO: "Romanian",
  RU: "Russian",
  SK: "Slovak",
  SL: "Slovenian",
  SV: "Swedish",
  ZH: "Chinese",
};

interface Values {
  key?: string;
  from?: string;
  to?: string;
  text?: string;
  translation?: string;
}

const Command = () => {
  const [key, setKey] = useState<LocalStorageValue | undefined>();
  const [loading, setLoading] = useState(true);
  const [translation, setTranslation] = useState("");

  useEffect(() => {
    (async () => {
      setKey(await getLocalStorageItem("deeplKey"));
      setLoading(false);
    })();
  }, []);

  const submitKey = async (values: Values) => {
    values.key && (await setLocalStorageItem("deeplKey", values.key));
    setKey(await getLocalStorageItem("deeplKey"));
  };

  const submitText = async (values: Values) => {
    if (values.text) {
      try {
        setLoading(true);
        const response = await got(
          `https://api-free.deepl.com/v2/translate?auth_key=${key}&text=${values.text}&target_lang=${values.to}${
            values.from ? `source_lang=${values.from}` : ""
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
          "Either something is wrong with your internet connection, API Key, or you've maxed out the free API quota for this month."
        );
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={key ? submitText : submitKey} />
          <OpenInBrowserAction title="Free API Key" url="https://www.deepl.com/pro-api" />
          <ActionPanel.Item
            title="Remove API Key"
            onAction={async () => {
              await removeLocalStorageItem("deeplKey");
              setKey(undefined);
            }}
          />
        </ActionPanel>
      }
      isLoading={loading}
    >
      {key ? (
        <>
          <Form.Dropdown id="from" defaultValue="" title="From">
            <Form.Dropdown.Item value="" title="Detect" />
            {Object.entries(languages).map(([value, title]) => (
              <Form.Dropdown.Item value={value} title={title} key={value} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown id="to" defaultValue="EN" title="To">
            {Object.entries(languages).map(([value, title]) => (
              <Form.Dropdown.Item value={value} title={title} key={value} />
            ))}
          </Form.Dropdown>
          <Form.Separator />
          <Form.TextArea id="text" placeholder="Enter or paste text here" />
          <Form.TextArea id="translation" value={translation} />
        </>
      ) : (
        <Form.TextField id="key" title="API Key" placeholder="Enter Key" />
      )}
    </Form>
  );
};
export default Command;
