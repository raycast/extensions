import React from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import debounce from "debounce";
import { useSelectedLanguagesSet } from "./hooks";
import { LanguageCode, supportedLanguagesByCode, languages } from "./languages";
import { AUTO_DETECT, simpleTranslate, SimpleTranslateResult } from "./simple-translate";
import { LanguagesManagerList } from "./LanguagesManager";

const TranslateForm = () => {
  const [selectedLanguageSet, setSelectedLanguageSet] = useSelectedLanguagesSet();
  const langFrom = selectedLanguageSet.langFrom;
  const langTo = selectedLanguageSet.langTo;
  const setLangFrom = (l: LanguageCode) => setSelectedLanguageSet({ ...selectedLanguageSet, langFrom: l });
  const setLangTo = (l: LanguageCode) => setSelectedLanguageSet({ ...selectedLanguageSet, langTo: l });
  const fromLangObj = supportedLanguagesByCode[langFrom];
  const toLangObj = supportedLanguagesByCode[langTo];

  const [text, setText] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [translated, setTranslated] = React.useState<SimpleTranslateResult | null>(null);

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
    const debouncedTranslate = debounce(async (text: string, langFrom: LanguageCode, langTo: LanguageCode) => {
      const result = await simpleTranslate(text, {
        langFrom,
        langTo,
      });

      setTranslated(result);
      setIsLoading(false);
    }, 500);

    return (text: string | undefined, langFrom: LanguageCode, langTo: LanguageCode) => {
      if (text) {
        setIsLoading(true);
        debouncedTranslate(text, langFrom, langTo);
      } else {
        setTranslated(null);
      }
    };
  }, []);

  React.useEffect(() => {
    doTranslate(text, langFrom, langTo);
  }, [text, langFrom, langTo]);

  const autoDetectedLanguage = React.useMemo(() => {
    if (langFrom === AUTO_DETECT && translated) {
      return supportedLanguagesByCode[translated.langFrom];
    }

    return null;
  }, [translated, langFrom]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Generals">
            <Action.CopyToClipboard
              title="Copy Translated"
              content={translated?.translatedText ?? ""}
              icon={toLangObj?.flag}
            />
            <Action.CopyToClipboard title="Copy Text" content={text ?? ""} icon={fromLangObj?.flag} />
            <Action.OpenInBrowser
              title="Open in Google Translate"
              shortcut={{ modifiers: ["opt"], key: "enter" }}
              url={
                "https://translate.google.com/?sl=" +
                langFrom +
                "&tl=" +
                langTo +
                "&text=" +
                encodeURIComponent(text) +
                "&op=translate"
              }
            />
            <Action.Push
              icon={Icon.Pencil}
              title="Manage language sets..."
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              target={<LanguagesManagerList />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Settings">
            <Action
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={() => {
                setSelectedLanguageSet({ langFrom: langTo, langTo: langFrom });
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
                    onAction={() => setLangFrom(lang.code)}
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
                    onAction={() => setLangTo(lang.code)}
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
      <Form.Dropdown
        id="language_from"
        title="From"
        value={autoDetectedLanguage?.code ?? langFrom}
        onChange={(v) => setLangFrom(v as LanguageCode)}
        storeValue
      >
        {autoDetectedLanguage && (
          <Form.Dropdown.Item
            value={autoDetectedLanguage.code}
            title={`${autoDetectedLanguage.name} (Auto-detect)`}
            icon={autoDetectedLanguage?.flag ?? "🏳️"}
          />
        )}
        {languages.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={lang?.flag ?? "🏳️"} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="language_to"
        title="To"
        value={langTo}
        onChange={(v) => setLangTo(v as LanguageCode)}
        storeValue
      >
        {languages
          .filter((lang) => lang.code !== AUTO_DETECT)
          .map((lang) => (
            <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={lang?.flag ?? "🏳️"} />
          ))}
      </Form.Dropdown>
      <Form.TextArea
        id="result"
        title="Translation"
        value={translated?.translatedText ?? ""}
        placeholder="Translation"
      />
    </Form>
  );
};

export default TranslateForm;
