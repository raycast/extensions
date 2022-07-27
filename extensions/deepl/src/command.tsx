import { List } from "@raycast/api";
import { Language, sourceLanguages, useTranslation, useUsage } from "./deepl-api";
import { useEffect, useState } from "react";
import TranslationResultListItem from "./components/TranslationResultListItem";
import SourceLanguageDropdown from "./components/SourceLanguageDropdown";

export default function Command(targetLanguage: Language): () => JSX.Element {
  return () => {
    const [text, setText] = useState("");
    const [sourceLanguage, setSourceLanguage] = useState<Language | undefined>(undefined);
    const { isLoading: isLoadingTranslation, data: translation } = useTranslation(text, sourceLanguage, targetLanguage);
    const { isLoading: isLoadingUsage, data: usage, revalidate: revalidateUsage } = useUsage();
    const isLoading = isLoadingUsage || isLoadingTranslation;
    const hasInput = text.length > 0;
    const hasTranslation = hasInput && translation !== undefined;

    useEffect(() => revalidateUsage(), [translation]);

    return (
      <List
        isLoading={isLoading && hasInput}
        onSearchTextChange={setText}
        searchBarPlaceholder={`Translate to ${targetLanguage.name} using DeepL…`}
        searchBarAccessory={
          <SourceLanguageDropdown sourceLanguages={sourceLanguages} onSourceLanguageChange={setSourceLanguage} />
        }
        throttle
      >
        {!isLoading && hasTranslation && <TranslationResultListItem translation={translation} usage={usage} />}
      </List>
    );
  };
}
