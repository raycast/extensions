import { List } from "@raycast/api";

export type Lang = "en" | "de" | "es" | "fr" | "tr";

export interface LangItem {
  title: string;
  key: string;
  source: Lang;
  target: Lang;
}

const TRANSLATIONS: LangItem[] = [
  {
    title: "🇹🇷 Turkish → English 🇬🇧",
    key: "tr-en",
    source: "tr",
    target: "en",
  },
  {
    title: "🇬🇧 English → Turkish 🇹🇷",
    key: "en-tr",
    source: "en",
    target: "tr",
  },
  {
    title: "🇪🇸 Spanish → English 🇬🇧",
    key: "es-en",
    source: "es",
    target: "en",
  },
  {
    title: "🇬🇧 English → Spanish 🇪🇸",
    key: "en-es",
    source: "en",
    target: "es",
  },
  {
    title: "🇩🇪 German → English 🇬🇧",
    key: "de-en",
    source: "de",
    target: "en",
  },
  {
    title: "🇬🇧 English → German 🇩🇪",
    key: "en-de",
    source: "en",
    target: "de",
  },
  {
    title: "🇫🇷 French → English 🇬🇧",
    key: "fr-en",
    source: "fr",
    target: "en",
  },
  {
    title: "🇬🇧 English → French 🇫🇷",
    key: "en-fr",
    source: "en",
    target: "fr",
  },
];

interface LangSelectorProps {
  onChange: (lang: LangItem) => void;
  value: LangItem;
}

export const DEFAULT_LANG: LangItem = TRANSLATIONS[0];

function LangSelector({ onChange, value }: LangSelectorProps) {
  return (
    <List.Dropdown
      tooltip="Select a language"
      value={value.key}
      defaultValue={DEFAULT_LANG.key}
      onChange={(key) => {
        const lang = TRANSLATIONS.find((item) => item.key === key) || DEFAULT_LANG;
        onChange(lang);
      }}
    >
      {TRANSLATIONS.map((item) => (
        <List.Dropdown.Item key={item.key} title={item.title} value={item.key} />
      ))}
    </List.Dropdown>
  );
}

export default LangSelector;
