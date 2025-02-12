import { ActionPanel, Action, Icon, List, Clipboard } from "@raycast/api";
import { useState, useCallback } from "react";
import { googleTranslate } from "../utils/translators/google";
import { openaiTranslate } from "../utils/translators/openai";
import { deepseekTranslate } from "../utils/translators/deepseek";
import { glmTranslate } from "../utils/translators/glm";
import { tencentTranslate } from "../utils/translators/tencent";
import { youdaoTranslate } from "../utils/translators/youdao";

import debounce from "lodash/debounce";

interface TranslateListProps {
  formatFunction: (text: string) => string;
  queryText?: string;
}

export function TranslateList({ formatFunction, queryText }: TranslateListProps) {
  const [searchText, setSearchText] = useState(queryText || "");
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<{ [key: string]: string }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [youdaoResults, setYoudaoResults] = useState<string[]>([]);

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
      youdao: true,
    });

    const services = {
      google: googleTranslate,
      openai: openaiTranslate,
      deepseek: deepseekTranslate,
      glm: glmTranslate,
      tencent: tencentTranslate,
    };

    // 并行处理所有翻译服务，但不等待全部完成
    Object.entries(services).forEach(async ([key, translator]) => {
      try {
        const translated = await translator(text);
        setResults((prev) => ({
          ...prev,
          [key]: translated ? formatFunction(translated) : "",
        }));
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

    // 单独处理有道翻译
    try {
      const translations = await youdaoTranslate(text);
      setYoudaoResults(translations.map((t) => formatFunction(t)));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        youdao: String(error),
      }));
    } finally {
      setLoading((prev) => ({
        ...prev,
        youdao: false,
      }));
    }
  };

  const debouncedTranslate = useCallback(
    debounce((text: string) => {
      if (text.trim()) {
        handleTranslate(text);
      }
    }, 1000),
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
      youdao: "Youdao",
    };

    // 收集所有翻译结果
    const translationMap = new Map<string, string[]>();

    // 处理普通翻译结果
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

    // 处理有道翻译结果
    if (youdaoResults.length > 0) {
      youdaoResults.forEach((result, index) => {
        if (!translationMap.has(result)) {
          translationMap.set(result, [`${services.youdao} ${index + 1}`]);
        } else {
          translationMap.get(result)?.push(`${services.youdao} ${index + 1}`);
        }
      });
    }

    // 按来源数量排序并渲染结果
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
                  <Action title="Paste" icon={Icon.TextInput} onAction={async () => await Clipboard.paste(result)} />
                  <Action
                    title="Copy to Clipboard"
                    icon={Icon.CopyClipboard}
                    onAction={async () => await Clipboard.copy(result)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />,
        );
      });

    // 最后添加错误结果
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
