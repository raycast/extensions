import React from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Clipboard,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getTranslatorConfig,
  smartTranslate,
  LANGUAGES,
  SOURCE_LANGUAGE_OPTIONS,
  TARGET_LANGUAGE_OPTIONS,
} from "./translator";
import { saveTranslation } from "./history";

export default function Command() {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Language selection states
  const [sourceLanguage, setSourceLanguage] = useState<string>(LANGUAGES.AUTO);
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState<string>(
    LANGUAGES.AUTO,
  );

  // Auto-load clipboard content on mount
  useEffect(() => {
    async function loadClipboard() {
      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText && clipboardText.trim()) {
          setInputText(clipboardText.trim());
        }
      } catch (error) {
        // Ignore clipboard read errors
        console.error("Failed to read clipboard:", error);
      }
    }
    loadClipboard();
  }, []);

  async function handleTranslate() {
    if (!inputText.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter text to translate.",
      });
      return;
    }

    const config = getTranslatorConfig();

    if (!config.apiKey || !config.apiURL) {
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message:
          "API Key and URL are not configured. Please check preferences.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Show detecting/translating toast
      showToast({
        style: Toast.Style.Animated,
        title:
          sourceLanguage === LANGUAGES.AUTO
            ? "Detecting language..."
            : "Translating...",
      });

      // Use smartTranslate with options
      const result = await smartTranslate(inputText.trim(), config, {
        sourceLanguage: sourceLanguage,
        targetLanguage: selectedTargetLanguage,
      });

      setDetectedLanguage(result.detectedLanguage);
      setTargetLanguage(result.targetLanguage);
      setTranslatedText(result.translatedText);

      // Save to history
      await saveTranslation(
        inputText.trim(),
        result.translatedText,
        result.detectedLanguage,
        result.targetLanguage,
      );

      showToast({
        style: Toast.Style.Success,
        title: "Translation Complete",
        message: `${result.detectedLanguage} → ${result.targetLanguage}`,
      });
    } catch (error) {
      console.error("Translation error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Translation Failed",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopyToClipboard() {
    if (!translatedText) {
      showToast({
        style: Toast.Style.Failure,
        title: "Nothing to Copy",
        message: "Please translate text first.",
      });
      return;
    }

    await Clipboard.copy(translatedText);
    showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: "Translation copied successfully.",
    });
  }

  async function handlePasteToActiveApp() {
    if (!translatedText) {
      showToast({
        style: Toast.Style.Failure,
        title: "Nothing to Paste",
        message: "Please translate text first.",
      });
      return;
    }

    await Clipboard.paste(translatedText);
    showToast({
      style: Toast.Style.Success,
      title: "Pasted to Active App",
    });
    await popToRoot();
  }

  function handleSwapLanguages() {
    // Only swap if both are not auto
    if (
      sourceLanguage !== LANGUAGES.AUTO &&
      selectedTargetLanguage !== LANGUAGES.AUTO
    ) {
      const tempSource = sourceLanguage;
      setSourceLanguage(selectedTargetLanguage);
      setSelectedTargetLanguage(tempSource);

      // Also swap the text if we have a translation
      if (translatedText) {
        setInputText(translatedText);
        setTranslatedText(inputText);
      }
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot Swap",
        message: "Please select specific languages to swap.",
      });
    }
  }

  async function handleTranslateAndPaste() {
    if (!inputText.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter text to translate.",
      });
      return;
    }

    const config = getTranslatorConfig();

    if (!config.apiKey || !config.apiURL) {
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: "API Key and URL are not configured.",
      });
      return;
    }

    setIsLoading(true);

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Translating and pasting...",
      });

      const result = await smartTranslate(inputText.trim(), config, {
        sourceLanguage: sourceLanguage,
        targetLanguage: selectedTargetLanguage,
      });

      await Clipboard.paste(result.translatedText);
      showToast({
        style: Toast.Style.Success,
        title: "Translated & Pasted",
        message: `${result.detectedLanguage} → ${result.targetLanguage}`,
      });
      await popToRoot();
    } catch (error) {
      console.error("Translation error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Translation Failed",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Translate">
            <Action
              title="Translate"
              icon={{ source: "command-icon.png" }}
              onAction={handleTranslate}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
            <Action
              title="Translate & Paste"
              onAction={handleTranslateAndPaste}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Results">
            <Action
              title="Copy Translation"
              onAction={handleCopyToClipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Paste to Active App"
              onAction={handlePasteToActiveApp}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Options">
            <Action
              title="Swap Languages"
              onAction={handleSwapLanguages}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="sourceLanguage"
        title="Source Language"
        value={sourceLanguage}
        onChange={setSourceLanguage}
      >
        {SOURCE_LANGUAGE_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="targetLanguage"
        title="Target Language"
        value={selectedTargetLanguage}
        onChange={setSelectedTargetLanguage}
      >
        {TARGET_LANGUAGE_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        id="inputText"
        title="Text to Translate"
        placeholder="Enter text here or it will be loaded from clipboard..."
        value={inputText}
        onChange={setInputText}
        enableMarkdown={false}
      />

      {detectedLanguage && (
        <Form.Description
          title="Detected"
          text={`${detectedLanguage} → ${targetLanguage}`}
        />
      )}

      <Form.Separator />

      <Form.TextArea
        id="translatedText"
        title="Translation"
        value={translatedText}
        onChange={setTranslatedText}
        placeholder="Translation will appear here..."
        enableMarkdown={false}
      />
    </Form>
  );
}
