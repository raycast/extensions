import { Clipboard, getPreferenceValues, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";

interface Preferences {
  provider: "openai" | "anthropic" | "gemini";
  openai_model: string;
  anthropic_model: string;
  gemini_model: string;
  apiKey: string;
}

async function fixGrammar(text: string, preferences: Preferences): Promise<string> {
  const { provider, openai_model, anthropic_model, gemini_model, apiKey } = preferences;

  const prompt = `Fix the grammar and spelling in the following text. Return ONLY the corrected text without any explanations, quotes, or additional commentary:\n\n${text}`;

  let model: string;
  switch (provider) {
    case "openai":
      model = openai_model;
      break;
    case "anthropic":
      model = anthropic_model;
      break;
    case "gemini":
      model = gemini_model;
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  try {
    switch (provider) {
      case "openai":
        return await fixWithOpenAI(text, model, apiKey, prompt);
      case "anthropic":
        return await fixWithAnthropic(text, model, apiKey, prompt);
      case "gemini":
        return await fixWithGemini(text, model, apiKey, prompt);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    throw new Error(`Failed to fix grammar: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fixWithOpenAI(text: string, model: string, apiKey: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function fixWithAnthropic(text: string, model: string, apiKey: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text.trim();
}

async function fixWithGemini(text: string, model: string, apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Fixing grammar...",
    });

    const selectedText = await getSelectedText();

    if (!selectedText || selectedText.trim().length === 0) {
      await showHUD("L No text selected");
      return;
    }

    const fixedText = await fixGrammar(selectedText, preferences);

    await Clipboard.paste(fixedText);

    await showHUD(" Grammar fixed");
  } catch (error) {
    await showHUD(`L ${error instanceof Error ? error.message : String(error)}`);
  }
}
