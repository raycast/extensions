import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Clipboard,
  Icon,
  Color,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";

interface Preferences {
  apiKey: string;
  apiEndpoint: string;
  model: string;
  targetLanguage: string;
}

interface TranslationHistory {
  id: string;
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  timestamp: number;
}

const languageMap: Record<string, string> = {
  en: "English",
  "zh-CN": "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish",
  polish: "Polish",
};

const languages = [
  { value: "auto", title: "Auto Detect", icon: Icon.Wand },
  { value: "en", title: "English", icon: Icon.Globe },
  { value: "zh-CN", title: "Chinese (Simplified)", icon: Icon.Globe },
  { value: "zh-TW", title: "Chinese (Traditional)", icon: Icon.Globe },
  { value: "ja", title: "Japanese", icon: Icon.Globe },
  { value: "ko", title: "Korean", icon: Icon.Globe },
  { value: "fr", title: "French", icon: Icon.Globe },
  { value: "de", title: "German", icon: Icon.Globe },
  { value: "es", title: "Spanish", icon: Icon.Globe },
];

async function translateText(
  text: string,
  targetLang: string,
  preferences: Preferences,
): Promise<string> {
  const { apiKey, apiEndpoint, model } = preferences;

  const systemPrompt =
    targetLang === "auto"
      ? "You are a professional translator. Detect the source language and translate to the most appropriate target language (Chinese to English, English to Chinese, or other languages to English). Only return the translated text without any explanation."
      : `You are a professional translator. Translate the following text to ${languageMap[targetLang] || targetLang}. Only return the translated text without any explanation.`;

  const response = await fetch(`${apiEndpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://raycast.com",
      "X-Title": "Raycast AI Translator",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Translation failed: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0].message.content.trim();
}

async function polishText(
  text: string,
  preferences: Preferences,
): Promise<string> {
  const { apiKey, apiEndpoint, model } = preferences;

  const systemPrompt =
    "You are a professional writing assistant. Polish and improve the following text while maintaining its original meaning and language. Improve grammar, clarity, and style. Only return the polished text without any explanation.";

  const response = await fetch(`${apiEndpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://raycast.com",
      "X-Title": "Raycast AI Translator",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Polish failed: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0].message.content.trim();
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [polishedText, setPolishedText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState(
    preferences.targetLanguage || "auto",
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useState<TranslationHistory[]>([]);

  // Load history from LocalStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedHistory = await LocalStorage.getItem<string>(
          "translation-history",
        );
        if (storedHistory) {
          const parsed = JSON.parse(storedHistory) as TranslationHistory[];
          setHistory(parsed);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
      }
    })();
  }, []);

  // Try to get text from clipboard on launch
  useEffect(() => {
    (async () => {
      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText && clipboardText.trim().length > 0) {
          const trimmed = clipboardText.trim();

          // Filter out potential API keys and sensitive data
          const looksLikeSensitiveData =
            trimmed.startsWith("sk-") ||
            trimmed.startsWith("Bearer ") ||
            trimmed.match(/^[A-Za-z0-9_-]{20,}$/) ||
            trimmed.includes("password") ||
            trimmed.includes("token") ||
            trimmed.includes("secret");

          if (!looksLikeSensitiveData) {
            setInputText(trimmed);
            setSearchText(trimmed);
          }
        }
      } catch (error) {
        // Ignore clipboard errors
      }
    })();
  }, []);

  const handleTranslate = useCallback(
    async (text: string, targetLang: string) => {
      if (!text || text.trim().length === 0) {
        setTranslatedText("");
        return;
      }

      setIsTranslating(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Translating...",
      });

      try {
        const result = await translateText(
          text.trim(),
          targetLang,
          preferences,
        );
        setTranslatedText(result);

        // Add to history
        const newHistoryItem: TranslationHistory = {
          id: Date.now().toString(),
          originalText: text.trim(),
          translatedText: result,
          targetLanguage: targetLang,
          timestamp: Date.now(),
        };

        setHistory((prev) => {
          // Remove duplicate if exists (same original text)
          const filtered = prev.filter(
            (item) => item.originalText !== text.trim(),
          );
          // Keep only last 10 items
          const newHistory = [newHistoryItem, ...filtered].slice(0, 10);

          // Persist to LocalStorage
          LocalStorage.setItem(
            "translation-history",
            JSON.stringify(newHistory),
          );

          return newHistory;
        });

        toast.style = Toast.Style.Success;
        toast.title = "Translation Complete";
      } catch (error) {
        setTranslatedText("");
        toast.style = Toast.Style.Failure;
        toast.title = "Translation Failed";
        toast.message =
          error instanceof Error ? error.message : "Unknown error occurred";
      } finally {
        setIsTranslating(false);
      }
    },
    [preferences],
  );

  const handlePolish = useCallback(
    async (text: string) => {
      if (!text || text.trim().length === 0) {
        return;
      }

      setIsTranslating(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Polishing...",
      });

      try {
        const result = await polishText(text.trim(), preferences);
        setPolishedText(result);

        // Add to history with "polish" as target language
        const newHistoryItem: TranslationHistory = {
          id: Date.now().toString(),
          originalText: inputText.trim(),
          translatedText: result,
          targetLanguage: "polish",
          timestamp: Date.now(),
        };

        setHistory((prev) => {
          // Remove duplicate if exists (same original text)
          const filtered = prev.filter(
            (item) => item.originalText !== inputText.trim(),
          );
          // Keep only last 10 items
          const newHistory = [newHistoryItem, ...filtered].slice(0, 10);

          // Persist to LocalStorage
          LocalStorage.setItem(
            "translation-history",
            JSON.stringify(newHistory),
          );

          return newHistory;
        });

        toast.style = Toast.Style.Success;
        toast.title = "Polish Complete";
      } catch (error) {
        setPolishedText("");
        toast.style = Toast.Style.Failure;
        toast.title = "Polish Failed";
        toast.message =
          error instanceof Error ? error.message : "Unknown error occurred";
      } finally {
        setIsTranslating(false);
      }
    },
    [preferences, inputText],
  );

  const handleInputChange = useCallback(
    (text: string) => {
      setSearchText(text);
      setInputText(text);
      // Clear translations when input changes
      if (text.trim() !== inputText.trim()) {
        setTranslatedText("");
        setPolishedText("");
      }
    },
    [inputText],
  );

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setTargetLanguage(lang);
      if (inputText && inputText.trim().length > 0) {
        handleTranslate(inputText, lang);
      }
    },
    [inputText, handleTranslate],
  );

  return (
    <List
      isLoading={isTranslating}
      searchBarPlaceholder="Enter text to translate..."
      searchText={searchText}
      onSearchTextChange={handleInputChange}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Target Language"
          value={targetLanguage}
          onChange={handleLanguageChange}
        >
          {languages.map((lang) => (
            <List.Dropdown.Item
              key={lang.value}
              value={lang.value}
              title={lang.title}
              icon={lang.icon}
            />
          ))}
        </List.Dropdown>
      }
    >
      {history.length === 0 && (!inputText || inputText.trim().length === 0) ? (
        <List.EmptyView
          icon={Icon.Text}
          title="Enter text to translate"
          description="Type in the search bar above to start translating"
        />
      ) : (
        <>
          {/* Show all three sections when there's input */}
          {inputText && inputText.trim().length > 0 && (
            <>
              {/* Current - Original Text */}
              <List.Section title="Current">
                <List.Item
                  icon={{ source: Icon.Document, tintColor: Color.Blue }}
                  title={inputText.split("\n")[0] || ""}
                  subtitle={
                    inputText.split("\n").length > 1
                      ? `... (${inputText.split("\n").length} lines)`
                      : undefined
                  }
                  accessories={[{ text: `${inputText.length} chars` }]}
                  detail={
                    <List.Item.Detail
                      markdown={`\`\`\`\n${inputText}\n\`\`\``}
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Translate"
                        icon={Icon.ArrowRight}
                        onAction={() =>
                          handleTranslate(inputText, targetLanguage)
                        }
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Text"
                        content={inputText}
                      />
                      {translatedText && (
                        <Action
                          title="Polish Translation"
                          icon={Icon.Stars}
                          onAction={() => handlePolish(translatedText)}
                          shortcut={{ modifiers: ["cmd"], key: "l" }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              </List.Section>

              {/* Translation */}
              <List.Section title="Translation">
                <List.Item
                  icon={{
                    source: translatedText ? Icon.CheckCircle : Icon.Clock,
                    tintColor: translatedText
                      ? Color.Green
                      : Color.SecondaryText,
                  }}
                  title={
                    translatedText
                      ? translatedText.split("\n")[0] || ""
                      : "Press Cmd+Enter to translate"
                  }
                  subtitle={
                    translatedText && translatedText.split("\n").length > 1
                      ? `... (${translatedText.split("\n").length} lines)`
                      : undefined
                  }
                  accessories={
                    translatedText
                      ? [
                          { text: `${translatedText.length} chars` },
                          {
                            text: languageMap[targetLanguage] || targetLanguage,
                          },
                        ]
                      : []
                  }
                  detail={
                    translatedText ? (
                      <List.Item.Detail
                        markdown={`\`\`\`\n${translatedText}\n\`\`\``}
                      />
                    ) : undefined
                  }
                  actions={
                    <ActionPanel>
                      {translatedText ? (
                        <>
                          <Action.CopyToClipboard
                            title="Copy Translation"
                            content={translatedText}
                            shortcut={{ modifiers: ["cmd"], key: "c" }}
                          />
                          <Action.Paste
                            title="Paste Translation"
                            content={translatedText}
                            shortcut={{ modifiers: ["cmd"], key: "v" }}
                          />
                          <Action
                            title="Translate Again"
                            icon={Icon.RotateClockwise}
                            shortcut={{ modifiers: ["cmd"], key: "r" }}
                            onAction={() =>
                              handleTranslate(inputText, targetLanguage)
                            }
                          />
                          <Action
                            title="Polish Translation"
                            icon={Icon.Stars}
                            onAction={() => handlePolish(translatedText)}
                            shortcut={{ modifiers: ["cmd"], key: "l" }}
                          />
                        </>
                      ) : (
                        <Action
                          title="Translate"
                          icon={Icon.ArrowRight}
                          onAction={() =>
                            handleTranslate(inputText, targetLanguage)
                          }
                          shortcut={{ modifiers: ["cmd"], key: "return" }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              </List.Section>

              {/* Polish */}
              <List.Section title="Polish">
                <List.Item
                  icon={{
                    source: polishedText ? Icon.Stars : Icon.Clock,
                    tintColor: polishedText
                      ? Color.Purple
                      : Color.SecondaryText,
                  }}
                  title={
                    polishedText
                      ? polishedText.split("\n")[0] || ""
                      : translatedText
                        ? "Press Cmd+L to polish"
                        : "Translate first"
                  }
                  subtitle={
                    polishedText && polishedText.split("\n").length > 1
                      ? `... (${polishedText.split("\n").length} lines)`
                      : undefined
                  }
                  accessories={
                    polishedText
                      ? [{ text: `${polishedText.length} chars` }]
                      : []
                  }
                  detail={
                    polishedText ? (
                      <List.Item.Detail
                        markdown={`\`\`\`\n${polishedText}\n\`\`\``}
                      />
                    ) : undefined
                  }
                  actions={
                    <ActionPanel>
                      {polishedText ? (
                        <>
                          <Action.CopyToClipboard
                            title="Copy Polished"
                            content={polishedText}
                            shortcut={{ modifiers: ["cmd"], key: "c" }}
                          />
                          <Action.Paste
                            title="Paste Polished"
                            content={polishedText}
                            shortcut={{ modifiers: ["cmd"], key: "v" }}
                          />
                          <Action
                            title="Polish Again"
                            icon={Icon.Stars}
                            shortcut={{ modifiers: ["cmd"], key: "l" }}
                            onAction={() => handlePolish(translatedText)}
                          />
                        </>
                      ) : translatedText ? (
                        <Action
                          title="Polish Translation"
                          icon={Icon.Stars}
                          onAction={() => handlePolish(translatedText)}
                          shortcut={{ modifiers: ["cmd"], key: "l" }}
                        />
                      ) : (
                        <Action
                          title="Translate First"
                          icon={Icon.ArrowRight}
                          onAction={() =>
                            handleTranslate(inputText, targetLanguage)
                          }
                          shortcut={{ modifiers: ["cmd"], key: "return" }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              </List.Section>
            </>
          )}

          {/* History */}
          {history.length > 0 && (
            <List.Section title="History">
              {history.map((item) => (
                <List.Item
                  key={item.id}
                  icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
                  title={item.originalText.split("\n")[0] || ""}
                  subtitle={`→ ${item.translatedText.split("\n")[0] || ""}`}
                  accessories={[
                    {
                      text:
                        languageMap[item.targetLanguage] || item.targetLanguage,
                    },
                    {
                      date: new Date(item.timestamp),
                      tooltip: new Date(item.timestamp).toLocaleString(),
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={`## Original\n\n\`\`\`\n${item.originalText}\n\`\`\`\n\n---\n\n## Translation\n\n\`\`\`\n${item.translatedText}\n\`\`\``}
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Use This Text"
                        icon={Icon.ArrowRight}
                        onAction={() => {
                          setInputText(item.originalText);
                          setSearchText(item.originalText);
                          setTranslatedText(item.translatedText);
                          setPolishedText("");
                          setTargetLanguage(item.targetLanguage);
                        }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Translation"
                        content={item.translatedText}
                      />
                      <Action.CopyToClipboard
                        title="Copy Original"
                        content={item.originalText}
                      />
                      <Action.CopyToClipboard
                        title="Copy Both"
                        content={`${item.originalText}\n\n---\n\n${item.translatedText}`}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
