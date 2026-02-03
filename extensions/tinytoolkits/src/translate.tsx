import { List, ActionPanel, Action, Icon, Color, showToast, Toast, LocalStorage, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { getLibreTranslateUrl, getDefaultTargetLanguage } from "./utils/config";
import { getDefaultTargetLanguageCode, isLanguageCodeAvailable } from "./utils/language";

// LibreTranslate API 配置
// const LIBRETRANSLATE_URL = "http://192.168.1.2:5000";
const LIBRETRANSLATE_URL = getLibreTranslateUrl();
// const [targetLanguage] = useState(getDefaultTargetLanguage());

// 在线翻译服务配置
interface OnlineTranslator {
  name: string;
  icon: Icon | string;
  color: Color;
  buildUrl: (text: string, sourceLang: string, targetLang: string) => string;
  description: string;
}

const onlineTranslators: OnlineTranslator[] = [
  {
    name: "Google Translate",
    // icon: Icon.Globe,
    icon: "google-logo.svg",
    color: Color.Blue,
    description: "Google 翻译",
    buildUrl: (text, source, target) => {
      // Google Translate URL 格式
      // https://translate.google.com/?sl=auto&tl=zh-CN&text=hello&op=translate
      const sourceLangMap: Record<string, string> = {
        auto: "auto",
        zh: "zh-CN",
        en: "en",
        ja: "ja",
        ko: "ko",
        fr: "fr",
        de: "de",
        es: "es",
        ru: "ru",
        ar: "ar",
        pt: "pt",
        it: "it",
      };
      const sl = sourceLangMap[source] || "auto";
      const tl = sourceLangMap[target] || "zh-CN";
      return `https://translate.google.com/?sl=${sl}&tl=${tl}&text=${encodeURIComponent(text)}&op=translate`;
    },
  },
  {
    name: "Baidu Translate",
    icon: "baidu-logo.svg",
    color: Color.Blue,
    description: "百度翻译",
    buildUrl: (text, source, target) => {
      // 百度翻译 URL 格式
      // https://fanyi.baidu.com/#en/zh/hello
      const langMap: Record<string, string> = {
        auto: "auto",
        zh: "zh",
        en: "en",
        ja: "jp",
        ko: "kor",
        fr: "fra",
        de: "de",
        es: "spa",
        ru: "ru",
        ar: "ara",
        pt: "pt",
        it: "it",
      };
      const from = langMap[source] || "auto";
      const to = langMap[target] || "zh";
      return `https://fanyi.baidu.com/#${from}/${to}/${encodeURIComponent(text)}`;
    },
  },
  {
    name: "DeepL Translate",
    icon: "deepl-logo.svg",
    color: Color.Blue,
    description: "DeepL 翻译",
    buildUrl: (text, source, target) => {
      // DeepL URL 格式
      // https://www.deepl.com/translator#en/zh/hello
      const langMap: Record<string, string> = {
        auto: "auto",
        zh: "zh",
        en: "en",
        ja: "ja",
        ko: "ko",
        fr: "fr",
        de: "de",
        es: "es",
        ru: "ru",
        pt: "pt",
        it: "it",
      };
      const from = source === "auto" ? "auto" : langMap[source] || "auto";
      const to = langMap[target] || "zh";
      return `https://www.deepl.com/translator#${from}/${to}/${encodeURIComponent(text)}`;
    },
  },
  {
    name: "Youdao Translate",
    icon: Icon.Globe,
    color: Color.Orange,
    description: "有道翻译",
    buildUrl: (text, source, target) => {
      // 有道翻译 URL 格式
      // https://fanyi.youdao.com/index.html#/TextTranslate|auto|zh-CHS|hello
      const langMap: Record<string, string> = {
        auto: "auto",
        zh: "zh-CHS",
        en: "en",
        ja: "ja",
        ko: "ko",
        fr: "fr",
        de: "de",
        es: "es",
        ru: "ru",
        ar: "ar",
        pt: "pt",
        it: "it",
      };
      const from = langMap[source] || "auto";
      const to = langMap[target] || "zh-CHS";
      return `https://fanyi.youdao.com/#/${from}/${to}/${encodeURIComponent(text)}`;
    },
  },
  {
    name: "Bing Translate",
    icon: "bing-logo.svg",
    color: Color.Blue,
    description: "必应翻译",
    buildUrl: (text, source, target) => {
      // Bing Translator URL 格式
      // https://www.bing.com/translator?from=en&to=zh-Hans&text=hello
      const langMap: Record<string, string> = {
        auto: "auto-detect",
        zh: "zh-Hans",
        en: "en",
        ja: "ja",
        ko: "ko",
        fr: "fr",
        de: "de",
        es: "es",
        ru: "ru",
        ar: "ar",
        pt: "pt",
        it: "it",
      };
      const from = langMap[source] || "auto-detect";
      const to = langMap[target] || "zh-Hans";
      return `https://www.bing.com/translator?from=${from}&to=${to}&text=${encodeURIComponent(text)}`;
    },
  },
];

// 语言配置
interface Language {
  code: string;
  name: string;
}

// 历史记录接口
interface TranslationHistory {
  id: string;
  original: string;
  translated: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState(getDefaultTargetLanguage());
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [history, setHistory] = useState<TranslationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // debug
  // const url = getLibreTranslateUrl();
  // console.log("url", LIBRETRANSLATE_URL);
  // console.log("targetLanguage", targetLanguage);
  // console.log("sourceLanguage", sourceLanguage);

  // 常用语言列表
  const commonLanguages: Language[] = [
    { code: "auto", name: "Auto Detect" },
    { code: "zh", name: "Chinese" },
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "ru", name: "Russian" },
    { code: "ar", name: "Arabic" },
    { code: "pt", name: "Portuguese" },
    { code: "it", name: "Italian" },
  ];

  const availableLanguages: Language[] =
    languages.length > 0 ? [{ code: "auto", name: "Auto Detect" }, ...languages] : commonLanguages;

  // console.log("availableLanguages", availableLanguages);

  // 初始化
  useEffect(() => {
    fetchLanguages();
    loadHistory();
  }, []);

  // 类型守卫
  // function isValidLanguageArray(data: unknown): data is Array<{ code: string; name: string }> {
  //   if (!Array.isArray(data)) return false;
  //   return data.every(
  //     (item) =>
  //       typeof item === "object" &&
  //       item !== null &&
  //       "code" in item &&
  //       "name" in item &&
  //       typeof item.code === "string" &&
  //       typeof item.name === "string"
  //   );
  // }

  function isValidTranslateResponse(data: unknown): data is { translatedText: string } {
    return (
      typeof data === "object" &&
      data !== null &&
      "translatedText" in data &&
      typeof (data as Record<string, unknown>).translatedText === "string"
    );
  }

  function isValidHistoryArray(data: unknown): data is TranslationHistory[] {
    if (!Array.isArray(data)) return false;
    return data.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "original" in item &&
        "translated" in item &&
        "sourceLang" in item &&
        "targetLang" in item &&
        "timestamp" in item,
    );
  }

  // async function fetchLanguages() {
  //   try {
  //     const response = await fetch(`${LIBRETRANSLATE_URL}/languages`);
  //     if (!response.ok) throw new Error("Failed to fetch languages");

  //     const data: unknown = await response.json();
  //     if (!isValidLanguageArray(data)) throw new Error("Invalid language data");

  //     setLanguages(data.map((lang) => ({ code: lang.code, name: lang.name })));
  //   } catch (error) {
  //     console.error("Failed to load languages:", error);
  //     setLanguages(commonLanguages.filter((lang) => lang.code !== "auto"));
  //   } finally {
  //     setIsLoadingLanguages(false);
  //   }
  // }

  // async function fetchLanguages() {
  //   try {
  //     const response = await fetch(`${LIBRETRANSLATE_URL}/languages`);
  //     if (!response.ok) throw new Error("Failed to fetch languages");

  //     const data: unknown = await response.json();
  //     if (!isValidLanguageArray(data)) throw new Error("Invalid language data");

  //     // 关键：统一中文 code 为 zh
  //     const normalizedLanguages = data.map((lang) => {
  //       // 把 zh-CN/zh-TW 都映射为 zh
  //       if (lang.code.startsWith("zh")) {
  //         return { code: "zh", name: "Chinese" };
  //       }
  //       return lang;
  //     }).filter((lang, index, self) => {
  //       // 去重：避免多个 zh 出现
  //       return self.findIndex(l => l.code === lang.code) === index;
  //     });

  //     setLanguages(normalizedLanguages);
  //   } catch (error) {
  //     console.error("Failed to load languages:", error);
  //     setLanguages(commonLanguages.filter((lang) => lang.code !== "auto"));
  //   } finally {
  //     setIsLoadingLanguages(false);
  //   }
  // }
  async function fetchLanguages() {
    setIsLoadingLanguages(true);
    try {
      // 检索本地语言列表
      // const response = await fetch(`${LIBRETRANSLATE_URL}/languages`);
      // if (!response.ok) throw new Error("Failed to fetch languages");
      // const data: unknown = await response.json();
      // if (!isValidLanguageArray(data)) throw new Error("Invalid language data");
      // data.forEach((lang) => {
      //   lang.code = normalizeLanguageCode(lang.code);
      // });
      // setLanguages(data.map((lang) => ({ code: lang.code, name: lang.name })));
      // do nothing
    } catch (error) {
      console.error("Failed to load languages:", error);
      setLanguages(commonLanguages.filter((lang) => lang.code !== "auto"));
    } finally {
      setIsLoadingLanguages(false);
    }
  }

  async function loadHistory() {
    try {
      const stored = await LocalStorage.getItem<string>("translation-history");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isValidHistoryArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }

  async function saveToHistory(original: string, translated: string, sourceLang: string, targetLang: string) {
    const newEntry: TranslationHistory = {
      id: Date.now().toString(),
      original,
      translated,
      sourceLang,
      targetLang,
      timestamp: Date.now(),
    };

    const newHistory = [newEntry, ...history.slice(0, 49)];
    setHistory(newHistory);

    try {
      await LocalStorage.setItem("translation-history", JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  }

  async function clearHistory() {
    setHistory([]);
    await LocalStorage.removeItem("translation-history");
    await showToast({ style: Toast.Style.Success, title: "History Cleared" });
  }

  async function translate(text: string, source: string, target: string) {
    if (!text.trim()) {
      setTranslatedText("");
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source, target }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // console.error(`Translation failed: ${response.status} - ${errorText}`);
        const errorMessage: string = JSON.parse(errorText).error;
        throw new Error(`[Fail]${response.status}:${errorMessage}`);
      }

      const data: unknown = await response.json();
      if (!isValidTranslateResponse(data)) throw new Error("Invalid response format");

      setTranslatedText(data.translatedText);
      await saveToHistory(text, data.translatedText, source, target);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // await showToast({ style: Toast.Style.Failure, title: "Translation Failed", message: errorMessage });
      await showToast({ style: Toast.Style.Failure, title: "", message: errorMessage });
      setTranslatedText("");
    } finally {
      setIsTranslating(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText.trim()) {
        translate(searchText, sourceLanguage, targetLanguage);
      } else {
        setTranslatedText("");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText, sourceLanguage, targetLanguage]);

  async function translateFromClipboard() {
    try {
      const clipboardText = await Clipboard.readText();
      if (clipboardText) {
        setSearchText(clipboardText);
      } else {
        await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Failed to read clipboard:", error.message);
      }
      await showToast({ style: Toast.Style.Failure, title: "Failed to read clipboard" });
    }
  }

  // 历史记录视图
  if (showHistory) {
    return (
      <List navigationTitle="Translation History" searchBarPlaceholder="Search history...">
        <List.Section title={`${history.length} translations`}>
          {history.map((item) => (
            <List.Item
              key={item.id}
              title={item.translated}
              subtitle={item.original}
              accessories={[
                { text: `${item.sourceLang} → ${item.targetLang}` },
                { date: new Date(item.timestamp), tooltip: new Date(item.timestamp).toLocaleString() },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Translation" content={item.translated} />
                  <Action.CopyToClipboard title="Copy Original" content={item.original} />
                  <Action
                    title="Use This Translation"
                    icon={Icon.ArrowRight}
                    onAction={() => {
                      setSearchText(item.original);
                      setSourceLanguage(item.sourceLang);
                      setTargetLanguage(item.targetLang);
                      setShowHistory(false);
                    }}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Back to Translate"
                      icon={Icon.ArrowLeft}
                      onAction={() => setShowHistory(false)}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                    />
                    <Action
                      title="Clear History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={clearHistory}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
        {history.length === 0 && (
          <List.EmptyView
            icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
            title="No History"
            description="Your translation history will appear here"
            actions={
              <ActionPanel>
                <Action title="Back" icon={Icon.ArrowLeft} onAction={() => setShowHistory(false)} />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  // 主视图
  return (
    <List
      isLoading={isTranslating || isLoadingLanguages}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder="Enter text to translate..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Target Language"
          // 智能兜底：如果当前 value 不在选项中，自动匹配
          value={
            isLanguageCodeAvailable(targetLanguage, availableLanguages)
              ? targetLanguage
              : getDefaultTargetLanguageCode(targetLanguage, availableLanguages, "zh")
          }
          onChange={(newValue) => {
            setTargetLanguage(newValue);
            // console.log("Selected language:", newValue);
          }}
        >
          {availableLanguages
            .filter((lang) => lang.code !== "auto")
            .map((lang) => (
              <List.Dropdown.Item key={lang.code} title={lang.name} value={lang.code} />
            ))}
        </List.Dropdown>
      }
      throttle
    >
      {translatedText ? (
        <List.Section title="LibreTranslate Result">
          <List.Item
            title={translatedText}
            subtitle={`Local translation to ${availableLanguages.find((l) => l.code === targetLanguage)?.name || targetLanguage}`}
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            accessories={[{ text: `${translatedText.length} chars` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Translation"
                  content={translatedText}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.Paste
                  title="Paste Translation"
                  content={translatedText}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                />
                <ActionPanel.Section>
                  <Action
                    title="From Clipboard"
                    icon={Icon.Clipboard}
                    onAction={translateFromClipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Swap Languages"
                    icon={Icon.ArrowsExpand}
                    onAction={() => {
                      if (sourceLanguage !== "auto") {
                        const temp = sourceLanguage;
                        setSourceLanguage(targetLanguage);
                        setTargetLanguage(temp);
                      }
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="History"
                    icon={Icon.Clock}
                    onAction={() => setShowHistory(true)}
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      ) : searchText ? (
        <List.EmptyView icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }} title="Translating..." />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Globe, tintColor: Color.SecondaryText }}
          title="Start Translating"
          description="Type text to translate or use online translators below"
          actions={
            <ActionPanel>
              <Action
                title="From Clipboard"
                icon={Icon.Clipboard}
                onAction={translateFromClipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="History"
                icon={Icon.Clock}
                onAction={() => setShowHistory(true)}
                shortcut={{ modifiers: ["cmd"], key: "h" }}
              />
            </ActionPanel>
          }
        />
      )}

      {/* 在线翻译服务 */}
      {searchText && (
        <List.Section title="Online Translation Services">
          {onlineTranslators.map((translator) => {
            const url = translator.buildUrl(searchText, sourceLanguage, targetLanguage);
            return (
              <List.Item
                key={translator.name}
                title={translator.name}
                subtitle={translator.description}
                icon={{ source: translator.icon, tintColor: translator.color }}
                accessories={[
                  {
                    text: "Open in Browser",
                    icon: Icon.ArrowRight,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title={`Translate with ${translator.name}`} url={url} />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* 原文显示 */}
      {searchText && (
        <List.Section title="Original Text">
          <List.Item
            title={searchText}
            subtitle={`Source: ${sourceLanguage === "auto" ? "Auto" : availableLanguages.find((l) => l.code === sourceLanguage)?.name || sourceLanguage}`}
            icon={{ source: Icon.Document, tintColor: Color.Blue }}
            accessories={[{ text: `${searchText.length} chars` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Original" content={searchText} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
