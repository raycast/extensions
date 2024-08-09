import { Action, ActionPanel, Form } from "@raycast/api";
import { FORM, IS_DEBUG, STR, UPDATE_INTERVALS } from "./constants";
import { LanguageFields, useConfig } from "./hooks/use-config";
import { Interval, Language, LanguageCode } from "./types";
import { getLanguages } from "./utils";

const languageRenderer = (lang: Language) => <Form.Dropdown.Item value={lang.key} keywords={[lang.key]} {...lang} />;

const filterLangs = (filterValue: LanguageCode) => (language: Language) => {
  return language.key !== filterValue;
};

export default function Config() {
  const { config, updateConfig, saveConfig } = useConfig();

  const setLanguage =
    <K extends keyof LanguageFields>(field: K) =>
    (language: string) => {
      updateConfig(field, language as LanguageCode);
    };

  const [languages, allLangs] = getLanguages();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Save Settings" onAction={saveConfig} />
        </ActionPanel>
      }
    >
      <Form.Dropdown {...FORM.first} onChange={setLanguage("firstLanguage")} value={config.firstLanguage}>
        <Form.Dropdown.Item value="" title={STR.DROPDOWN_HINT} />
        {allLangs.filter(filterLangs(config.secondLanguage)).map(languageRenderer)}
      </Form.Dropdown>

      <Form.Dropdown {...FORM.second} onChange={setLanguage("secondLanguage")} value={config.secondLanguage}>
        <Form.Dropdown.Item value="" title={STR.DROPDOWN_HINT} />
        {allLangs.filter(filterLangs(config.firstLanguage)).map(languageRenderer)}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown {...FORM.learning} onChange={setLanguage("learningLanguage")} value={config.learningLanguage}>
        <Form.Dropdown.Item value="" title={STR.DROPDOWN_HINT} />
        {(config.firstLanguage && config.secondLanguage
          ? [languages[config.firstLanguage], languages[config.secondLanguage]]
          : []
        ).map(languageRenderer)}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Checkbox
        {...FORM.swap}
        onChange={(newFlag) => updateConfig("swapWordsInMenuBar", newFlag)}
        value={config.swapWordsInMenuBar}
      />
      <Form.TextField
        {...FORM.delimiter}
        onChange={(newDelimiter) => updateConfig("delimiter", newDelimiter)}
        value={config.delimiter}
      />

      <Form.Dropdown
        {...FORM.updateInterval}
        onChange={(newInterval) => updateConfig("wordInterval", newInterval as Interval)}
        value={config.wordInterval}
      >
        {(IS_DEBUG ? ["DEBUG --- 1 Minute", ...UPDATE_INTERVALS] : UPDATE_INTERVALS).map((interval) => (
          <Form.Dropdown.Item key={interval} value={interval} title={interval} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
    </Form>
  );
}
