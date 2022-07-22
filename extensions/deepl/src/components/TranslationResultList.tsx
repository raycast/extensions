import { getPreferenceValues, List } from "@raycast/api";
import { Language, setUpTranslation, sourceLanguages, TranslationState, Usage } from "../lib/deeplapi";
import TranslationResultListItem from "./TranslationResultListItem";

export default function TranslationResultList(props: { targetLanguage: Language }) {
  const { state, setSourceLanguage, setText } = setUpTranslation(props.targetLanguage);

  const onSourceLanguageChange = (newValue: Language | null) => {
    setSourceLanguage(newValue);
  };

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={setText}
      searchBarPlaceholder={`Translate to ${props.targetLanguage.name} using DeepL…`}
      searchBarAccessory={
        <SourceLanguageDropdown sourceLanguages={sourceLanguages} onSourceLanguageChange={onSourceLanguageChange} />
      }
      throttle
    >
      <List.Section title={generateTitle(state)} subtitle={generateSubtitle(state.usage)}>
        <TranslationResultListItem state={state} />
      </List.Section>
    </List>
  );
}

function generateTitle(state: TranslationState): string {
  if (state.translation == null) {
    return "Translation:";
  }

  const sourceLanguage =
    state.sourceLanguage ??
    sourceLanguages.find(function (language: Language) {
      return language.code == state.translation?.detected_source_language;
    });

  if (sourceLanguage == null) {
    return "Translation:";
  }

  return `Translated from ${sourceLanguage.name}:`;
}

function generateSubtitle(usage: Usage | null): string {
  if (usage == null) {
    return "";
  }

  const usagePercentage = (usage.character_count / usage.character_limit).toLocaleString(undefined, {
    style: "percent",
    maximumFractionDigits: 2,
  });

  const characterCount = usage.character_count.toLocaleString();
  const characterLimit = usage.character_limit.toLocaleString();
  const plan = getPreferenceValues().plan == "free" ? "DeepL API Free" : "DeepL API Pro";

  return `${usagePercentage} of ${plan} plan used this period (${characterCount} / ${characterLimit} characters)`;
}

function SourceLanguageDropdown(props: {
  sourceLanguages: Language[];
  onSourceLanguageChange: (newValue: Language | null) => void;
}) {
  const { sourceLanguages, onSourceLanguageChange } = props;

  return (
    <List.Dropdown
      tooltip="Select Source Language"
      onChange={(newValue) => {
        onSourceLanguageChange(sourceLanguages.find((language: Language) => language.code == newValue) as Language);
      }}
    >
      <List.Dropdown.Section title="Source Language">
        <List.Dropdown.Item key="AUTODETECT" title="Autodetect" value="AUTODETECT" />
        {sourceLanguages.map((language) => (
          <List.Dropdown.Item key={language.code} title={language.name} value={`${language.code}`} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
