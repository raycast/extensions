import React from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useDebouncedValue, useSelectedLanguagesSet, useTextState } from "./hooks";
import { LanguageCode, supportedLanguagesByCode, languages, getLanguageFlag } from "./languages";
import { AUTO_DETECT, simpleTranslate } from "./simple-translate";
import { LanguagesManagerList } from "./LanguagesManager";
import { ConfigurableCopyPasteActions, OpenOnGoogleTranslateWebsiteAction } from "./actions";

export default function TranslateForm() {
  const [selectedLanguageSet, setSelectedLanguageSet] = useSelectedLanguagesSet();
  const langFrom = selectedLanguageSet.langFrom;
  const langTo = Array.isArray(selectedLanguageSet.langTo) ? selectedLanguageSet.langTo[0] : selectedLanguageSet.langTo;
  const setLangFrom = (l: LanguageCode) => setSelectedLanguageSet({ ...selectedLanguageSet, langFrom: l });
  const setLangTo = (l: LanguageCode) => setSelectedLanguageSet({ ...selectedLanguageSet, langTo: [l] });
  const fromLangObj = supportedLanguagesByCode[langFrom];
  const toLangObj = supportedLanguagesByCode[langTo];

  const [text, setText] = useTextState();
  const debouncedValue = useDebouncedValue(text, 500);
  const { data: translated, isLoading } = usePromise(
    simpleTranslate,
    [debouncedValue, { langFrom: fromLangObj.code, langTo: [toLangObj.code] }],
    {
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: error.name,
          message: error.message,
        });
      },
    },
  );

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
            <ConfigurableCopyPasteActions defaultActionsPrefix="Translated" value={translated?.translatedText ?? ""} />
            <Action.CopyToClipboard title="Copy Text" content={text ?? ""} />
            <Action.CopyToClipboard
              title="Copy Pronunciation"
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              content={translated?.pronunciationText ?? ""}
            />
            <OpenOnGoogleTranslateWebsiteAction translationText={text} translation={{ langFrom, langTo }} />
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
                setSelectedLanguageSet({ langFrom: langTo, langTo: [langFrom] });
              }}
              title={`${getLanguageFlag(toLangObj, toLangObj?.code)} <-> ${getLanguageFlag(
                fromLangObj,
                fromLangObj?.code,
              )} Switch Languages`}
            />
            <ActionPanel.Submenu
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              title="Change Languages"
              icon={getLanguageFlag(fromLangObj)}
            >
              <ActionPanel.Submenu
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                title="Change From Language"
                icon={getLanguageFlag(fromLangObj)}
              >
                {languages.map((lang) => (
                  <Action
                    key={lang.code}
                    onAction={() => setLangFrom(lang.code)}
                    title={lang.name}
                    icon={getLanguageFlag(lang)}
                  />
                ))}
              </ActionPanel.Submenu>
              <ActionPanel.Submenu
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                title="Change To Language"
                icon={getLanguageFlag(toLangObj)}
              >
                {languages.map((lang) => (
                  <Action
                    key={lang.code}
                    onAction={() => setLangTo(lang.code)}
                    title={lang.name}
                    icon={getLanguageFlag(lang)}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text" value={text} onChange={handleChange} />
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
            icon={getLanguageFlag(autoDetectedLanguage)}
          />
        )}
        {languages.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={getLanguageFlag(lang)} />
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
            <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={getLanguageFlag(lang)} />
          ))}
      </Form.Dropdown>
      <Form.TextArea
        id="result"
        title="Translation"
        value={translated?.translatedText ?? ""}
        placeholder="Translation"
      />
      <Form.Description title="Pronunciation" text={translated?.pronunciationText ?? ""} />
    </Form>
  );
}
