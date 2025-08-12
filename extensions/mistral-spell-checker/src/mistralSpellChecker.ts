import { Clipboard, Toast, getPreferenceValues, getSelectedText, showToast } from "@raycast/api";

interface AIClientConfig {
  endpoint: string;
  model: string;
  apiKey: string;
  temperature?: number;
}

interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

class AIClient {
  private config: AIClientConfig;

  constructor(config: AIClientConfig) {
    this.config = config;
  }

  async correctText(text: string): Promise<string> {
    const systemPrompt = `
You are a diligent assistant that corrects all spelling and grammar.
Return *only* the fixed text, with no commentary, no extra formatting, and no quotes. Just the corrected text. Make sure to only update invalid grammar and spelling, do not change anything else. Keep abbreviations as they are. Keep the original text's formatting. ONLY return the full corrected text.
    `.trim();

    const response = await fetch(this.config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `
THIS IS THE TEXT TO CORRECT:
<TEXT>
${text}
</TEXT>
            `.trim(),
          },
        ],
        temperature: this.config.temperature ?? 0.5,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as AIResponse;
    let resText: string | undefined = data.choices?.[0]?.message?.content?.trim();
    if (!resText) {
      throw new Error("Empty response from AI service");
    }

    resText = resText.replace(/^"+/, "").replace(/"+$/, "");
    return resText;
  }
}

interface Preferences {
  apiKey: string;
  model?: string;
  endpoint?: string;
}

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;

  if (!apiKey) {
    await showToast(Toast.Style.Failure, "API key not set in preferences");
    return;
  }

  const selection = await getSelectedText();
  if (!selection) {
    await showToast(Toast.Style.Failure, "No text selected");
    return;
  }

  await showToast(Toast.Style.Animated, "Correcting ...");

  try {
    // Create AI client with configurable settings
    const aiClient = new AIClient({
      endpoint: preferences.endpoint ?? "https://api.mistral.ai/v1/chat/completions",
      model: preferences.model ?? "mistral-medium-latest-flash",
      apiKey: apiKey,
    });

    const resText = await aiClient.correctText(selection);
    await Clipboard.copy(resText);
    await showToast(Toast.Style.Success, "Corrected text copied!");
  } catch (error) {
    if (error instanceof Error) {
      await showToast(Toast.Style.Failure, `Error: ${error.message}`);
    }
  }
}
