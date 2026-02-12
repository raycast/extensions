import { useEffect, useState } from "react";
import {
  ActionPanel,
  Form,
  Action,
  getSelectedText,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { type TargetLanguage, LANGUAGES, TOAST_MESSAGES } from "./types";
import { translateText as translateWithClaude } from "./claude-api";
import { translateText as translateWithOpenAI } from "./openai-api";

export default function Command() {
  const { claudeApiKey, openaiApiKey, copyToClipboard } = getPreferenceValues();
  const [text, setText] = useState<string>("");
  const [translation, setTranslation] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  const handleSubmit = async (lang: TargetLanguage) => {
    if (!text.trim()) {
      await showToast({ style: Toast.Style.Failure, ...TOAST_MESSAGES.emptyText });
      return;
    }

    // validate at least one api key is provided
    if (!claudeApiKey && !openaiApiKey) {
      await showToast({ style: Toast.Style.Failure, ...TOAST_MESSAGES.noApiKey });
      return;
    }

    setIsTranslating(true);
    setTranslation("");

    try {
      // prefer claude if both keys are provided
      const result = claudeApiKey
        ? await translateWithClaude({ text, lang, apiKey: claudeApiKey })
        : await translateWithOpenAI({ text, lang, apiKey: openaiApiKey! });

      setTranslation(result);

      if (copyToClipboard) {
        await Clipboard.copy(result);
      }

      await showToast({
        style: Toast.Style.Success,
        ...(copyToClipboard ? TOAST_MESSAGES.successCopied : TOAST_MESSAGES.success),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

      await showToast({ style: Toast.Style.Failure, ...TOAST_MESSAGES.failure, message: errorMessage });
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const selectedText = await getSelectedText();
        setText(selectedText);
      } catch {
        // no text selected, that's fine
      }
    };
    void init();
  }, []);

  return (
    <Form
      isLoading={isTranslating}
      actions={
        <ActionPanel>
          <ActionPanel.Submenu title="Translate to …">
            {LANGUAGES.map((lang) => (
              <Action key={lang.code} title={lang.label} onAction={() => handleSubmit(lang.code)} />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Source Text"
        placeholder="Enter text to translate..."
        value={text}
        onChange={setText}
      />
      <Form.Separator />
      <Form.TextArea
        id="translation"
        title="Translation"
        placeholder="Translation will appear here..."
        value={translation}
      />
    </Form>
  );
}
