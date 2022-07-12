import React from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import translate from "@vitalets/google-translate-api";
import debounce from "debounce";
import { usePreferences } from "./hooks";
import { LanguageCode, supportedLanguagesByCode, languages } from "./languages";

const TranslateForm = () => {
  const preferences = usePreferences();

  const [text, setText] = React.useState("");
  const [fromLang, setFromLang] = React.useState<LanguageCode | string>(preferences.lang1);
  const fromLangObj = supportedLanguagesByCode[fromLang as LanguageCode];
  const [toLang, setToLang] = React.useState<LanguageCode | string>(preferences.lang2);
  const toLangObj = supportedLanguagesByCode[toLang as LanguageCode];

  const [isLoading, setIsLoading] = React.useState(false);
  const [translated, setTranslated] = React.useState<translate.ITranslateResponse["text"]>();

  const handleChange = (value: string) => {
    if (value.length > 5000) {
      setText(value.slice(0, 5000));
      showToast({
        style: Toast.Style.Failure,
        title: "Limit",
        message: "Max length (5000 chars) for a single translation exceeded",
      });
    } else {
      setText(value);
    }
  };

  const doTranslate = React.useMemo(() => {
    const debouncedTranslate = debounce(
      async (text: string, fromLang: LanguageCode | string, toLang: LanguageCode | string) => {
        const result = await translate(text, {
          from: fromLang,
          to: toLang,
        });

        setTranslated(result.text);
        setIsLoading(false);
      },
      500
    );

    return (text: string | undefined, fromLang: LanguageCode | string, toLang: LanguageCode | string) => {
      if (text) {
        setIsLoading(true);
        debouncedTranslate(text, fromLang, toLang);
      } else {
        setTranslated("");
      }
    };
  }, []);

  React.useEffect(() => {
    doTranslate(text, fromLang, toLang);
  }, [text, fromLang, toLang]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Generals">
            <Action.CopyToClipboard title="Copy Translated" content={translated ?? ""} icon={toLangObj?.flag} />
            <Action.CopyToClipboard title="Copy Text" content={text ?? ""} icon={fromLangObj?.flag} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Settings">
            <Action
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={() => {
                const oldFromLang = fromLang;
                setFromLang(toLang);
                setToLang(oldFromLang);
              }}
              title={`${toLangObj.flag || toLangObj.code} <-> ${fromLangObj.flag || fromLangObj.code} Switch Languages`}
            />
            <ActionPanel.Submenu
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              title="Change Languages"
              icon={fromLangObj?.flag}
            >
              <ActionPanel.Submenu
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                title="Change From Language"
                icon={fromLangObj?.flag}
              >
                {languages.map((lang) => (
                  <Action
                    key={lang.code}
                    onAction={() => setFromLang(lang.code)}
                    title={lang.name}
                    icon={lang?.flag ?? "🏳️"}
                  />
                ))}
              </ActionPanel.Submenu>
              <ActionPanel.Submenu
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                title="Change To Language"
                icon={toLangObj?.flag}
              >
                {languages.map((lang) => (
                  <Action
                    key={lang.code}
                    onAction={() => setToLang(lang.code)}
                    title={lang.name}
                    icon={lang?.flag ?? "🏳️"}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text" onChange={handleChange} />
      <Form.Dropdown id="language_from" title="From" value={fromLang} onChange={setFromLang} storeValue>
        {languages.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={lang?.flag ?? "🏳️"} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="language_to" title="To" value={toLang} onChange={setToLang} storeValue>
        {languages.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={lang?.flag ?? "🏳️"} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="result" title="Translation" value={translated} placeholder="Translation" />
    </Form>
  );
};

export default TranslateForm;
