import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  openrouterApiKey: string;
  model: string;
  autoUseClipboard: boolean;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

const SYSTEM_PROMPT = `You are a prompt refinement tool. Your job is to take the user's rough prompt and rewrite it to be clearer and more effective for use with AI assistants.

RULES:
1. KEEP the original intent and topic - do not change what the user is asking for
2. Make it clearer, more specific, and better structured
3. Add helpful context or constraints that align with the original request
4. Output ONLY the improved prompt - no explanations, no meta-text
5. NEVER ask questions or request clarification
6. Match the language of the input (if Turkish, respond in Turkish)

Your goal: Take a vague or poorly-written prompt and make it BETTER while keeping the same purpose.

Example:
Input: "write code for website"
Output: "Write clean, well-structured code for a modern responsive website. Include:
- HTML5 semantic structure
- CSS3 with flexbox/grid layout
- JavaScript for interactivity
- Mobile-first responsive design
Please provide commented code with clear organization."

Now improve the following prompt:`;

export async function enhancePrompt(prompt: string): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.openrouterApiKey;
  const model = preferences.model || "qwen/qwen3-coder:free";

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://raycast.com",
        "X-Title": "Raycast Prompt Enhancer",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  if (data.error) {
    throw new Error(data.error.message);
  }

  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response from the model");
  }

  return data.choices[0].message.content.trim();
}
