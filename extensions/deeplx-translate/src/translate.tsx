import { ActionPanel, Action, List, showToast, Toast, getPreferenceValues, Icon } from "@raycast/api";
import { useState, useCallback, useRef, useEffect } from "react";

interface Preferences {
  apiEndpoint: string;
  apiKey?: string;
  showAlternatives?: boolean; // 是否显示备选翻译
}

interface TranslationResponse {
  code: number;
  data: string;
  id: number;
  alternatives?: string[];
}

interface TranslationResult {
  lang: string;
  langTitle: string;
  translation: string;
  alternatives?: string[];
  error?: string;
}

interface TranslationRequest {
  text: string;
  source_lang?: string;
  target_lang: string;
}

const LANGUAGE_OPTIONS = [
  { value: "auto", title: "Auto Detect" },
  { value: "ZH", title: "Chinese" },
  { value: "EN", title: "English" },
  { value: "JA", title: "Japanese" },
  { value: "FR", title: "French" },
  { value: "DE", title: "German" },
  { value: "ES", title: "Spanish" },
  { value: "IT", title: "Italian" },
  { value: "RU", title: "Russian" },
  { value: "PT", title: "Portuguese" },
  { value: "KO", title: "Korean" },
  { value: "AR", title: "Arabic" },
];

// 固定目标语言：英文和中文
function getTargetLanguages() {
  return [
    { value: "EN", title: "English" },
    { value: "ZH", title: "Chinese" },
  ];
}

// 渲染翻译详情页面
function renderTranslationDetail(result: TranslationResult): string {
  if (result.error) {
    return `# Translation Error\n\n**${result.langTitle}**\n\n\`\`\`\n${result.error}\n\`\`\``;
  }

  let markdown = `# ${result.langTitle} Translation\n\n`;

  // 主翻译结果（突出显示）
  markdown += `## Main Translation\n\n`;
  markdown += `> ${result.translation}\n\n`;

  // 备选翻译（如果存在且开启了显示选项）
  const preferences = getPreferenceValues<Preferences>();
  if (result.alternatives && result.alternatives.length > 0 && preferences.showAlternatives !== false) {
    markdown += `---\n\n`;
    markdown += `## Alternative Translations (${result.alternatives.length})\n\n`;

    if (result.alternatives.length > 5) {
      markdown += `*Showing first 5 of ${result.alternatives.length} alternatives*\n\n`;
    }

    result.alternatives.slice(0, 5).forEach((alt, index) => {
      markdown += `**${index + 1}. ${alt}**\n\n`;
    });

    if (result.alternatives.length > 5) {
      markdown += `*... and ${result.alternatives.length - 5} more alternatives*`;
    }
  }

  return markdown;
}

// 防抖函数
function useDebounce<T extends (...args: Parameters<T>) => ReturnType<T>>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay],
  );
}

// 单个翻译请求
async function performTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  preferences: Preferences,
): Promise<TranslationResult> {
  try {
    const response = await fetch(preferences.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(preferences.apiKey && { Authorization: `Bearer ${preferences.apiKey}` }),
      },
      body: JSON.stringify({
        text: text.trim(),
        source_lang: sourceLang === "auto" ? undefined : sourceLang,
        target_lang: targetLang,
      } as TranslationRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as TranslationResponse;

    if (data.code !== 200) {
      throw new Error(`API error: ${data.code}`);
    }

    return {
      lang: targetLang,
      langTitle: LANGUAGE_OPTIONS.find((l) => l.value === targetLang)?.title || targetLang,
      translation: data.data,
      alternatives: data.alternatives,
    };
  } catch (error) {
    return {
      lang: targetLang,
      langTitle: LANGUAGE_OPTIONS.find((l) => l.value === targetLang)?.title || targetLang,
      translation: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [text, setText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TranslationResult[]>([]);

  const handleTextChange = useDebounce((value: string) => {
    if (value.trim().length >= 2) {
      handleTranslate(value.trim(), sourceLang);
    } else {
      // 清除结果当文本为空或过短时
      setResults([]);
    }
  }, 800); // 800ms 防抖，等待用户停止输入

  // 当语言切换时重新触发翻译
  useEffect(() => {
    if (text.trim().length >= 2) {
      handleTranslate(text.trim(), sourceLang);
    }
  }, [sourceLang]);

  async function handleTranslate(translateText: string, translateSourceLang: string) {
    if (!translateText.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      // 固定目标语言：英文和中文
      const targetLangs = getTargetLanguages();
      const translationPromises = targetLangs.map((lang) =>
        performTranslation(translateText, translateSourceLang, lang.value, preferences),
      );

      const translationResults = await Promise.all(translationPromises);
      setResults(translationResults);
    } catch (error) {
      showToast(
        Toast.Style.Failure,
        "Translation Failed",
        error instanceof Error ? error.message : "Unknown error occurred",
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  // 如果有结果，显示翻译结果列表；否则显示输入界面
  if (results.length > 0 && text.trim().length >= 2 && !isLoading) {
    return (
      <List
        navigationTitle="Translation Results"
        searchBarPlaceholder="Enter new text or modify..."
        searchText={text}
        throttle={true}
        isShowingDetail={true}
        onSearchTextChange={(value) => {
          setText(value);
          handleTextChange(value);
        }}
        searchBarAccessory={
          <List.Dropdown tooltip="Source Language" value={sourceLang} onChange={setSourceLang}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <List.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
            ))}
          </List.Dropdown>
        }
      >
        {results.map((result) => (
          <List.Item
            key={result.lang}
            title={result.translation}
            actions={
              <ActionPanel>
                {!result.error && (
                  <>
                    <Action.CopyToClipboard
                      title={`Copy ${result.langTitle} Translation`}
                      content={result.translation}
                    />
                    {result.alternatives && result.alternatives.length > 0 && (
                      <Action.CopyToClipboard
                        title="Copy All Alternative Translations"
                        content={result.alternatives.join("\n")}
                      />
                    )}
                  </>
                )}
              </ActionPanel>
            }
            detail={<List.Item.Detail markdown={renderTranslationDetail(result)} />}
          />
        ))}
      </List>
    );
  }

  // 显示搜索/输入界面
  return (
    <List
      isLoading={isLoading}
      navigationTitle="DeepL Translator"
      searchBarPlaceholder="Enter text to translate..."
      searchText={text}
      onSearchTextChange={(value) => {
        setText(value);
        handleTextChange(value);
      }}
      searchBarAccessory={
        <List.Dropdown tooltip="Source Language" value={sourceLang} onChange={setSourceLang}>
          {LANGUAGE_OPTIONS.map((lang) => (
            <List.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Globe}
        title="DeepL Translator"
        description="Enter text to translate into Chinese and English"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View API Documentation" url="https://github.com/OwO-Network/DeepLX" />
          </ActionPanel>
        }
      />
    </List>
  );
}
