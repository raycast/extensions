import {
  ActionPanel,
  Action,
  Form,
  Detail,
  useNavigation,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";

interface Preferences {
  apiEndpoint: string;
  apiKey?: string;
}

interface TranslationResponse {
  code: number;
  data: string;
  id: number;
  alternatives?: string[];
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

export default function Command() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [text, setText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("ZH");
  const [isLoading, setIsLoading] = useState(false);

  async function detectLanguage(text: string): Promise<string | undefined> {
    // Simple language detection based on character ranges
    if (/[\u4e00-\u9fa5]/.test(text)) return "ZH"; // Chinese characters
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "JA"; // Japanese characters
    if (/[\uac00-\ud7a3]/.test(text)) return "KO"; // Korean characters
    if (/[\u0600-\u06ff]/.test(text)) return "AR"; // Arabic characters
    if (/[а-яА-Я]/.test(text)) return "RU"; // Russian characters
    return undefined;
  }

  async function handleTranslate() {
    if (!text.trim()) {
      showToast(Toast.Style.Failure, "Please enter text to translate");
      return;
    }

    setIsLoading(true);
    try {
      const detectedTargetLang = targetLang === "auto" ? detectLanguage(text) : targetLang;
      const finalTargetLang = detectedTargetLang || "EN"; // Fallback to English if detection fails

      const response = await fetch(preferences.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(preferences.apiKey && { Authorization: `Bearer ${preferences.apiKey}` }),
        },
        body: JSON.stringify({
          text: text.trim(),
          source_lang: sourceLang === "auto" ? undefined : sourceLang,
          target_lang: finalTargetLang,
        } as TranslationRequest),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as TranslationResponse;

      if (data.code !== 200) {
        throw new Error(`Translation error: ${data.code}`);
      }

      push(
        <Detail
          markdown={`# Translation Result\n\n**Original:**\n${text}\n\n**Translation:**\n${data.data}${
            data.alternatives && data.alternatives.length > 0
              ? `\n\n**Alternatives:**\n${data.alternatives.map((alt, i) => `${i + 1}. ${alt}`).join("\n")}`
              : ""
          }`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Translation" content={data.data} />
              <Action.CopyToClipboard title="Copy Original Text" content={text} />
              <Action title="Translate Again" onAction={() => push(<Command />)} />
            </ActionPanel>
          }
        />,
      );
    } catch (error) {
      showToast(
        Toast.Style.Failure,
        "Translation Failed",
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate" onSubmit={handleTranslate} icon={Icon.Paperclip} />
          <Action.OpenInBrowser
            title="Open API Documentation"
            url="https://github.com/OwO-Network/DeepLX"
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text to Translate"
        placeholder="Enter text to translate..."
        value={text}
        onChange={setText}
        autoFocus
      />

      <Form.Dropdown id="sourceLang" title="Source Language" value={sourceLang} onChange={setSourceLang}>
        {LANGUAGE_OPTIONS.map((lang) => (
          <Form.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="targetLang" title="Target Language" value={targetLang} onChange={setTargetLang}>
        <Form.Dropdown.Item value="auto" title="Auto Detect" />
        {LANGUAGE_OPTIONS.filter((lang) => lang.value !== "auto").map((lang) => (
          <Form.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description title="API Configuration" text={`Current Endpoint: ${preferences.apiEndpoint}`} />
      <Form.Description text="To modify API settings, go to Raycast Preferences → Extensions → DeepLX Translate" />
    </Form>
  );
}
