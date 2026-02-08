import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getSelectedText,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { compilePrompt, formatOutputForMode, OutputMode } from "./lib/llm";

type FormValues = {
  input: string;
  outputMode: OutputMode;
};

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string; chatPath?: string }> = {
  deepseek: { baseUrl: "https://api.deepseek.com", model: "deepseek-chat" },
  kimi: { baseUrl: "https://api.moonshot.cn", model: "moonshot-v1-32k" },
  openai: { baseUrl: "https://api.openai.com", model: "gpt-4o" },
  anthropic: { baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-5" },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    chatPath: "/chat/completions",
  },
};

function getApiConfig(
  prefs: Preferences.Index
): { provider: string; apiKey: string; baseUrl: string; model: string; chatPath?: string } | null {
  const { provider, apiKey, model } = prefs;
  if (!apiKey?.trim()) return null;
  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.deepseek;
  const finalBaseUrl = (defaults.baseUrl || "").replace(/\/$/, "");
  const finalModel = model?.trim() || defaults.model;
  return {
    provider,
    apiKey: apiKey.trim(),
    baseUrl: finalBaseUrl,
    model: finalModel || defaults.model,
    chatPath: defaults.chatPath,
  };
}

const API_KEY_HELP: Record<string, string> = {
  deepseek: "[platform.deepseek.com](https://platform.deepseek.com) → API Keys",
  kimi: "[platform.moonshot.cn](https://platform.moonshot.cn)",
  openai: "[platform.openai.com](https://platform.openai.com) → API keys",
  anthropic: "[console.anthropic.com](https://console.anthropic.com)",
  gemini: "[aistudio.google.com](https://aistudio.google.com) → Get API key",
};

export default function Command() {
  const [result, setResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [outputMode, setOutputMode] = useState<OutputMode>("both");

  useEffect(() => {
    void prefillFromSelection();
  }, []);

  async function prefillFromSelection() {
    try {
      const selectedText = (await getSelectedText()).trim();
      if (selectedText) {
        setInput(selectedText);
      }
    } catch {
      // No selected text is available; this is expected in many flows.
    }
  }

  async function useSelectedText() {
    try {
      const selectedText = (await getSelectedText()).trim();
      if (!selectedText) {
        showToast({ style: Toast.Style.Failure, title: "No selected text found" });
        return;
      }
      setInput(selectedText);
      showToast({ style: Toast.Style.Success, title: "Loaded selected text" });
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Unable to read selected text",
        message: "Highlight text in another app, then try again.",
      });
    }
  }

  async function handleSubmit(values: FormValues) {
    const text = (values.input || "").trim();
    const mode = values.outputMode || outputMode;
    setErrorMessage(null);
    if (!text) {
      showToast({ style: Toast.Style.Failure, title: "Please enter text" });
      return;
    }

    const prefs = getPreferenceValues<Preferences.Index>();
    const config = getApiConfig(prefs);
    if (!config) {
      showToast({
        style: Toast.Style.Failure,
        title: "API not configured",
        message: "Open Extension Preferences (⌘,), select provider, then paste the API key.",
      });
      return;
    }

    setLoading(true);
    try {
      const compiled = await compilePrompt(text, config);
      const output = formatOutputForMode(compiled, mode);
      setResult(output);
      setErrorMessage(null);
      await Clipboard.copy(output);
      showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const isAuthError =
        message.includes("401") || message.includes("Invalid Authentication") || message.includes("Invalid API key");
      if (isAuthError) {
        const provider = config?.provider ?? prefs.provider;
        const help = API_KEY_HELP[provider]
          ? `Get or check your key: ${API_KEY_HELP[provider]}`
          : "Check key and provider in Extension Preferences (⌘,).";
        setErrorMessage(
          `## Invalid API key\n\n${help}\n\n**Quick checks:**\n- Re-paste the API key (no extra spaces before/after)\n- Confirm the key is active at the provider’s console\n- Ensure **API / Model** matches the key (e.g. DeepSeek key → DeepSeek selected)`
        );
      } else {
        setErrorMessage(`## Error\n\n${message}`);
      }
      showToast({
        style: Toast.Style.Failure,
        title: isAuthError ? "Invalid API key" : "Error",
        message: isAuthError ? "See below; open Preferences (⌘,) to fix." : message,
      });
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  if (errorMessage !== null) {
    return (
      <Detail
        markdown={errorMessage}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            <Action title="Try Again" onAction={() => setErrorMessage(null)} />
            <Action title="Use Selected Text" onAction={useSelectedText} />
          </ActionPanel>
        }
      />
    );
  }

  if (result !== null) {
    return (
      <Detail
        markdown={result}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={result} title="Copy to Clipboard" />
            <Action title="Compile Another" onAction={() => setResult(null)} />
            <Action title="Use Selected Text" onAction={useSelectedText} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Compile" onSubmit={handleSubmit} />
          <Action title="Use Selected Text" onAction={useSelectedText} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input text"
        value={input}
        onChange={setInput}
        placeholder="Paste or type text in any language…"
        enableMarkdown={false}
      />
      <Form.Dropdown
        id="outputMode"
        title="Output Mode"
        value={outputMode}
        onChange={(value) => setOutputMode(value as OutputMode)}
      >
        <Form.Dropdown.Item value="both" title="Translation + Optimized Prompt" />
        <Form.Dropdown.Item value="translation" title="Translation Only" />
        <Form.Dropdown.Item value="prompt" title="Optimized Prompt Only" />
      </Form.Dropdown>
    </Form>
  );
}
