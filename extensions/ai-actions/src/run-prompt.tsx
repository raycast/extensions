import {
  List,
  ActionPanel,
  Action,
  getSelectedText,
  Clipboard,
  showToast,
  Toast,
  getPreferenceValues,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";

interface AIPrompt {
  id: string;
  title: string;
  prompt: string;
  icon?: string;
  createdAt: number;
}

interface Preferences {
  apiFormat: "gemini" | "openai";
  apiKey: string;
  model: string;
  customEndpoint?: string;
}

export default function Command() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    const stored = await LocalStorage.getItem<string>("ai-prompts");
    if (stored) {
      setPrompts(JSON.parse(stored));
    }
    setIsLoading(false);
  }

  if (prompts.length === 0 && !isLoading) {
    return (
      <Detail
        markdown="# No Prompts Found\n\nPlease create some AI prompts first using the **Manage AI Prompts** command."
        actions={
          <ActionPanel>
            <Action.Open title="Open Manage Prompts" target="raycast://extensions/manage-prompts" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      {prompts.map((prompt) => (
        <List.Item
          key={prompt.id}
          title={prompt.title}
          subtitle={prompt.prompt.substring(0, 60) + "..."}
          icon={prompt.icon || "✨"}
          actions={
            <ActionPanel>
              <Action.Push title="Run Prompt" target={<RunPromptView prompt={prompt} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RunPromptView({ prompt }: { prompt: AIPrompt }) {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    processText();
  }, []);

  async function processText() {
    try {
      const prefs = getPreferenceValues<Preferences>();

      if (!prefs.apiKey) {
        setError("Please set API Key in extension preferences");
        setIsLoading(false);
        return;
      }

      let textToProcess = "";
      try {
        textToProcess = await getSelectedText();
      } catch {
        const clipboardText = await Clipboard.readText();
        if (clipboardText) {
          textToProcess = clipboardText;
        }
      }

      if (!textToProcess) {
        setError("Please select text or copy to clipboard");
        setIsLoading(false);
        return;
      }

      setOriginalText(textToProcess);

      const finalPrompt = prompt.prompt.replace(/\{selection\}/g, textToProcess);

      const processedText = await generateWithAI(finalPrompt, prefs);
      setResult(processedText);
      setIsLoading(false);

      await showToast({
        style: Toast.Style.Success,
        title: "✅ Complete",
      });
    } catch (err) {
      console.error("Processing error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  }

  if (error) {
    return <Detail markdown={`# ❌ Error\n\n${error}`} />;
  }

  const markdown = `# ${prompt.title}\n\n${result || "Processing..."}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        !isLoading && result ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Result" content={result} />
            <Action.Paste title="Paste Result" content={result} />
            <Action.CopyToClipboard title="Copy Original" content={originalText} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

async function generateWithAI(prompt: string, prefs: Preferences): Promise<string> {
  let endpoint = prefs.customEndpoint || "https://generativelanguage.googleapis.com";
  endpoint = endpoint.replace(/\/$/, "");

  const isOpenAI = prefs.apiFormat === "openai";

  let url: string;
  let headers: Record<string, string>;
  let body: string;

  if (isOpenAI) {
    // OpenAI API format (for OpenRouter)
    // Check if endpoint already has /v1
    const hasV1 = endpoint.endsWith("/v1");
    url = hasV1 ? `${endpoint}/chat/completions` : `${endpoint}/v1/chat/completions`;

    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${prefs.apiKey}`,
      "HTTP-Referer": "https://raycast.com",
      "X-Title": "AI Quick Actions",
    };
    body = JSON.stringify({
      model: prefs.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 8192,
    });
  } else {
    // Gemini API format (for official Gemini or gemini-balance)
    url = `${endpoint}/v1beta/models/${prefs.model}:generateContent`;
    headers = {
      "Content-Type": "application/json",
      "x-goog-api-key": prefs.apiKey,
    };
    body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (isOpenAI) {
    // OpenAI response format
    const openAIData = data as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return openAIData.choices?.[0]?.message?.content || "";
  } else {
    // Gemini response format
    const geminiData = data as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    return parts[parts.length - 1]?.text || parts[0]?.text || "";
  }
}
