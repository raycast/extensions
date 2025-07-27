import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useState, useCallback } from "react";
import { googleTranslate } from "../utils/translators/google";
import { openaiTranslate } from "../utils/translators/openai";
import { deepseekTranslate } from "../utils/translators/deepseek";
import { glmTranslate } from "../utils/translators/glm";
import { tencentTranslate } from "../utils/translators/tencent";
import { youdaoTranslate } from "../utils/translators/youdao";
import { raycastTranslate } from "../utils/translators/raycast";

import debounce from "lodash/debounce";

import { FormatList } from "./FormatList";

interface TranslateListProps {
  queryText?: string;
}

export function TranslateList({ queryText }: TranslateListProps) {
  const [searchText, setSearchText] = useState(queryText || "");
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<{ [key: string]: string }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [youdaoResults, setYoudaoResults] = useState<string[]>([]);

  // Format translated text
  const formatTranslatedText = (text: string) => {
    return text
      .split(/\s+/)
      .map((word) => (word === word.toUpperCase() && word.length > 1 ? word : word.toLowerCase()))
      .join(" ");
  };

  const handleTranslate = async (text: string) => {
    setHasSearched(true);
    setResults({});
    setErrors({});
    setYoudaoResults([]);
    setLoading({
      google: true,
      openai: true,
      deepseek: true,
      glm: true,
      tencent: true,
      raycast: true,
      youdao: true,
    });

    const services = {
      google: googleTranslate,
      openai: openaiTranslate,
      deepseek: deepseekTranslate,
      glm: glmTranslate,
      tencent: tencentTranslate,
      raycast: raycastTranslate,
      youdao: async (text: string) => {
        const translations = await youdaoTranslate(text);
        setYoudaoResults(translations.map(formatTranslatedText));
        return formatTranslatedText(translations[0] || "");
      },
    };

    // Process regular translation results
    Object.entries(services).forEach(async ([key, translator]) => {
      try {
        const translated = await translator(text);
        if (key !== "youdao") {
          setResults((prev) => ({
            ...prev,
            [key]: formatTranslatedText(translated || ""),
          }));
        }
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [key]: String(error),
        }));
      } finally {
        setLoading((prev) => ({
          ...prev,
          [key]: false,
        }));
      }
    });
  };

  const debouncedTranslate = useCallback(
    debounce((text: string) => {
      if (text.trim()) {
        handleTranslate(text);
      }
    }, 800),
    [],
  );

  const renderItems = () => {
    const items: JSX.Element[] = [];
    const services = {
      google: "Google",
      openai: "OpenAI",
      deepseek: "Deepseek",
      glm: "GLM",
      tencent: "Tencent",
      raycast: "Raycast AI",
      youdao: "Youdao",
    };

    // Collect all translation results
    const translationMap = new Map<string, string[]>();

    // Process regular translation results
    Object.entries(services).forEach(([key, title]) => {
      if (key !== "youdao" && results[key]) {
        const result = results[key];
        if (!translationMap.has(result)) {
          translationMap.set(result, [title]);
        } else {
          translationMap.get(result)?.push(title);
        }
      }
    });

    // Process Youdao translation results
    if (youdaoResults.length > 0) {
      youdaoResults.forEach((result, index) => {
        if (!translationMap.has(result)) {
          translationMap.set(result, [`${services.youdao} ${index + 1}`]);
        } else {
          translationMap.get(result)?.push(`${services.youdao} ${index + 1}`);
        }
      });
    }

    // Sort by source count and render results
    Array.from(translationMap.entries())
      .sort(([, sourcesA], [, sourcesB]) => sourcesB.length - sourcesA.length)
      .forEach(([result, sources]) => {
        items.push(
          <List.Item
            key={result}
            title={result}
            subtitle={sources.join(", ")}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push title="Format Options" icon={Icon.Text} target={<FormatList text={result} />} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />,
        );
      });

    // Add error results at the end
    Object.entries(services).forEach(([key, title]) => {
      if (errors[key]) {
        items.push(<List.Item key={`error-${key}`} icon={Icon.ExclamationMark} title={errors[key]} subtitle={title} />);
      }
    });

    return items;
  };

  return (
    <List
      isLoading={Object.values(loading).some((value) => value)}
      searchText={searchText}
      onSearchTextChange={(text) => {
        setSearchText(text);
        if (!text.trim()) {
          setHasSearched(false);
        }
        debouncedTranslate(text);
      }}
      searchBarPlaceholder="Enter text..."
    >
      <List.EmptyView
        icon={Object.values(loading).some((value) => value) ? Icon.Clock : Icon.QuestionMark}
        title={
          Object.values(loading).some((value) => value)
            ? "Translating..."
            : !hasSearched
              ? "Enter Text to Translate"
              : "No Results Found"
        }
        description={
          Object.values(loading).some((value) => value)
            ? "Please wait"
            : !hasSearched
              ? "Type something to get variable name suggestions"
              : "Try another text or check translation service settings"
        }
      />
      {renderItems()}
    </List>
  );
}
