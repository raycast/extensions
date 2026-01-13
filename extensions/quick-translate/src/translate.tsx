import {
  getSelectedText,
  Clipboard,
  Detail,
  ActionPanel,
  Action,
  getPreferenceValues,
  popToRoot,
  showHUD,
  Icon,
} from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import * as deepl from "deepl-node";

const LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "it", name: "Italian" },
  { code: "pt-PT", name: "Portuguese" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese" },
] as const;

function getLanguageName(code: string): string {
  return LANGUAGES.find((lang) => lang.code === code)?.name ?? code;
}

async function translateText(
  apiKey: string,
  text: string,
  targetLang: string,
): Promise<string> {
  const translator = new deepl.Translator(apiKey);
  const result = await translator.translateText(
    text,
    null,
    targetLang as deepl.TargetLanguageCode,
  );
  return result.text;
}

function formatError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Unknown error";
  if (message.includes("Authorization") || message.includes("403")) {
    return "Invalid API Key - check preferences";
  }
  return message;
}

export default function Command() {
  const { apiKey, defaultLanguage } = getPreferenceValues<ExtensionPreferences>();
  const [targetLang, setTargetLang] = useState(defaultLanguage);
  const [sourceText, setSourceText] = useState("");
  const [translation, setTranslation] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastCheckedTextRef = useRef("");

  const doTranslate = useCallback(
    async (text: string, lang: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await translateText(apiKey, text, lang);
        setTranslation(result);
        await Clipboard.copy(result);
      } catch (err) {
        setError(formatError(err));
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey],
  );

  useEffect(() => {
    let cancelled = false;

    async function checkSelectedText(): Promise<void> {
      try {
        const selectedText = await getSelectedText();
        if (cancelled) return;

        const trimmed = selectedText?.trim() ?? "";
        if (trimmed && trimmed !== lastCheckedTextRef.current) {
          lastCheckedTextRef.current = trimmed;
          setSourceText(trimmed);
          await doTranslate(trimmed, targetLang);
        } else if (!trimmed && !lastCheckedTextRef.current) {
          setError("No text selected");
          setIsLoading(false);
        }
      } catch {
        if (cancelled) return;
        if (!lastCheckedTextRef.current) {
          setError("No text selected");
          setIsLoading(false);
        }
      }
    }

    checkSelectedText();
    const interval = setInterval(checkSelectedText, 300);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [targetLang, doTranslate]);

  async function handleLanguageChange(lang: string): Promise<void> {
    if (!sourceText) return;
    setTargetLang(lang);
    await doTranslate(sourceText, lang);
  }

  async function handlePaste(): Promise<void> {
    if (!translation) return;
    await Clipboard.paste(translation);
    await popToRoot({ clearSearchBar: true });
  }

  async function handleCopy(): Promise<void> {
    if (!translation) return;
    await Clipboard.copy(translation);
    await showHUD("Copied");
    await popToRoot({ clearSearchBar: true });
  }

  if (error === "No text selected") {
    return (
      <Detail markdown="## Select text to translate\n\nSelect some text in any application and it will be translated automatically." />
    );
  }

  if (error) {
    return <Detail markdown={`## Error\n\n${error}`} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={getLanguageName(targetLang)}
      markdown={translation}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Paste Translation"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={handlePaste}
            />
            <Action
              title="Copy Translation"
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={handleCopy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Change Language">
            {LANGUAGES.filter((lang) => lang.code !== targetLang).map(
              (lang) => (
                <Action
                  key={lang.code}
                  title={lang.name}
                  icon={Icon.Globe}
                  onAction={() => handleLanguageChange(lang.code)}
                />
              ),
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
