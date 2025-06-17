import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { analyzeText, SupportedLanguage } from "./utils";

export default function Command() {
  const [input, setInput] = useState<string>("");
  const { data: analysis, isLoading } = usePromise(
    async (text) => {
      if (!text || text.trim().length === 0) return null;
      return await analyzeText(text);
    },
    [input],
  );

  const getLanguageDisplayName = (lang: SupportedLanguage): string => {
    const languageNames: Record<SupportedLanguage, string> = {
      en: "English",
      zh: "中文",
      es: "Español",
      fr: "Français",
      de: "Deutsch",
      ja: "日本語",
    };
    return languageNames[lang];
  };

  const getLanguageIcon = (lang: SupportedLanguage): Icon => {
    const languageIcons: Record<SupportedLanguage, Icon> = {
      en: Icon.Globe,
      zh: Icon.Text,
      es: Icon.Text,
      fr: Icon.Text,
      de: Icon.Text,
      ja: Icon.Text,
    };
    return languageIcons[lang];
  };

  const getLanguageColor = (lang: SupportedLanguage): Color => {
    const languageColors: Record<SupportedLanguage, Color> = {
      en: Color.Blue,
      zh: Color.Red,
      es: Color.Orange,
      fr: Color.Purple,
      de: Color.Yellow,
      ja: Color.Green,
    };
    return languageColors[lang];
  };

  const getCopyActions = (content: string) => (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy" content={content} />
    </ActionPanel>
  );

  return (
    <List onSearchTextChange={setInput} searchBarPlaceholder="Enter text to analyze..." isLoading={isLoading}>
      {analysis && (
        <>
          <List.Section title="Text Analysis">
            <List.Item
              key="language"
              icon={{ source: getLanguageIcon(analysis.language), tintColor: getLanguageColor(analysis.language) }}
              title="Language"
              subtitle={getLanguageDisplayName(analysis.language)}
              actions={getCopyActions(getLanguageDisplayName(analysis.language))}
            />
            <List.Item
              key="sentences"
              icon={{ source: Icon.Document, tintColor: Color.Green }}
              title="Sentences"
              subtitle={`${analysis.sentenceCount} sentence${analysis.sentenceCount !== 1 ? "s" : ""}`}
              actions={getCopyActions(analysis.sentenceCount.toString())}
            />
            <List.Item
              key="words"
              icon={{ source: Icon.Text, tintColor: Color.Blue }}
              title="Words"
              subtitle={`${analysis.wordCount} word${analysis.wordCount !== 1 ? "s" : ""}`}
              actions={getCopyActions(analysis.wordCount.toString())}
            />
          </List.Section>

          {analysis.sentences.length > 0 && (
            <List.Section title="Sentences">
              {analysis.sentences.map((sentence, index) => (
                <List.Item
                  key={`sentence-${index}`}
                  icon={{ source: Icon.Document, tintColor: Color.Green }}
                  title={`Sentence ${index + 1}`}
                  subtitle={sentence}
                  actions={getCopyActions(sentence)}
                />
              ))}
            </List.Section>
          )}

          {analysis.words.length > 0 && (
            <List.Section title="Words">
              {analysis.words.map((word, index) => (
                <List.Item
                  key={`word-${index}`}
                  icon={{ source: Icon.Text, tintColor: Color.Blue }}
                  title={`Word ${index + 1}`}
                  subtitle={word}
                  actions={getCopyActions(word)}
                />
              ))}
            </List.Section>
          )}
        </>
      )}

      {!analysis && !isLoading && (
        <List.EmptyView
          icon={{ source: Icon.Text, tintColor: Color.Orange }}
          title="No Text to Analyze"
          description="Enter some text in the search bar to analyze it."
        />
      )}
    </List>
  );
}
