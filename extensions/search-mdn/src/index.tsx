import { useCallback, useMemo, useState } from "react";

import { List, getPreferenceValues } from "@raycast/api";

import { ResultItem } from "@/components/ResultItem";
import { useCompatPrefetch } from "@/hooks/use-compat-prefetch";
import { useSearch } from "@/hooks/use-search";
import { SUPPORTED_LANGUAGES, isSupportedLanguage } from "@/lib/mdn";
import type { SupportedLanguage } from "@/lib/mdn";

type CommandPreferences = {
  defaultAction?: "preview" | "open";
  language?: string;
};

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  "en-US": "English (US)",
  es: "Español",
  fr: "Français",
  ja: "日本語",
  ko: "한국어",
  "pt-BR": "Português (Brasil)",
  ru: "Русский",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
};

export default function MDNSearchResultsList() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const preferences = getPreferenceValues<CommandPreferences>();
  const preferredAction = preferences.defaultAction === "open" ? "open" : "preview";
  const defaultLanguage = isSupportedLanguage(preferences.language) ? preferences.language : "en-US";
  const [language, setLanguage] = useState<SupportedLanguage>(defaultLanguage);

  const { data, isLoading, revalidate } = useSearch(query, language);

  const selectedResult = useMemo(() => {
    return data.find((item) => item.id === selectedId) ?? data[0];
  }, [data, selectedId]);

  const compatByPath = useCompatPrefetch(data, selectedResult);

  const handleReloadSearchIndex = useCallback(() => {
    void revalidate();
  }, [revalidate]);

  const handleLanguageChange = useCallback((value: string) => {
    if (!isSupportedLanguage(value)) {
      return;
    }

    setLanguage(value);
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder="Search MDN..."
      onSearchTextChange={setQuery}
      onSelectionChange={setSelectedId}
      searchBarAccessory={
        <List.Dropdown tooltip="Language" value={language} onChange={handleLanguageChange}>
          {SUPPORTED_LANGUAGES.map((locale) => (
            <List.Dropdown.Item key={locale} title={LANGUAGE_LABELS[locale]} value={locale} />
          ))}
        </List.Dropdown>
      }
      throttle
    >
      {data.map((result) => (
        <ResultItem
          key={result.id}
          result={result}
          locale={language}
          preferredAction={preferredAction}
          compat={compatByPath[result.path]}
          onReloadSearchIndex={handleReloadSearchIndex}
        />
      ))}
    </List>
  );
}
