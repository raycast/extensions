import OpenAI from "openai";

export interface ProcessTextOptions {
  text: string;
  action: string;
  model: string;
  temperature: number;
  maxTokens: number;
  openaiApiKey: string;
  openrouterApiKey: string;
  customSystemPrompt?: string;
  customPrompt?: string;
  commandName?: string;
  preferences?: any;
}

export interface PromptTemplate {
  system: string;
  user: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are a text‑rewriting assistant used inside an automation workflow.
Always output ONLY the transformed text—without quotation marks or extra explanations
so it can directly replace the user's original selection.
Preserve the original language unless the action is a translation.
If the original text contains greetings or salutations, keep them; and do NOT add greetings if they were absent.
Always maintain the topic and meaning.
For tone‑changing actions, adjust the tone while keeping the meaning intact.
If you can catch the gender from the message, use the corresponding gender; if not, assume they're male by default.`;

const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  normalRewrite: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: 'Improve grammar and clarity while keeping a friendly tone:\n"{text}"',
  },
  rewriteInWorkplaceTone: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Rewrite this for a chill Slack chat, use tech/startup abbreviations and keep it simple, like B2 language level and don't add greetings if the original message doesn't have:\n\"{text}\"",
  },
  response_positive: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Imagine you’re the recipient of this message — give a positive reply to it:\n{text}",
  },
  response_negative: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Imagine you’re the recipient of this message — give a negative reply to it:\n{text}",
  },
  humorrewrite: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Rewrite the text below with a simple humorous tone:\n{text}",
  },
  shortner: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Shorten the following text:\n{text}",
  },
  translateToTurkish: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Translate the text into Turkish using clear language. Rewrite for clarity if necessary:\n{text}",
  },
  translateToPersian: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Translate the text into Persian using clear language. Rewrite for clarity if necessary:\n{text}",
  },
  translateToEnglish: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Translate the text into English using clear language. Rewrite for clarity if necessary:\n{text}",
  },
  translateToEnglishCasual: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Translate the following text into casual english and keep the context and make it more clear if needed:\n{text}",
  },
  translateToSpanish: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Translate the text into Spanish using clear language. Rewrite for clarity if necessary:\n{text}",
  },
  generateQuestions: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Generate questions from the following text:\n{text}",
  },
  suggestImprovements: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Suggest improvements to enhance clarity and effectiveness:\n{text}",
  },
  expandOnIdeas: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Expand on the ideas in 10 succinct lines:\n{text}",
  },
  convertToBulletPoints: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Convert the following text into bullet points:\n{text}",
  },
  generateTitle: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Generate a concise title for the following text:\n{text}",
  },
  summarizeText: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Summarize the following text:\n{text}",
  },
  identifyKeyPoints: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "Identify the key points or main ideas:\n{text}",
  },
  generalQuestion: {
    system: DEFAULT_SYSTEM_PROMPT,
    user: "{text}",
  },
};

export async function processText(
  options: ProcessTextOptions,
): Promise<string | null> {
  const {
    text,
    action,
    model,
    temperature,
    maxTokens,
    openaiApiKey,
    openrouterApiKey,
    customSystemPrompt,
    customPrompt,
    commandName,
    preferences,
  } = options;

  const template = PROMPT_TEMPLATES[action];
  if (!template) {
    throw new Error(`Unknown action: ${action}`);
  }

  // Get command-specific settings if available
  let finalModel = model;
  let finalCustomPrompt = customPrompt;

  if (commandName && preferences) {
    // Get command-specific model
    const commandModelKey = `${commandName}Model`;
    if (preferences[commandModelKey] && preferences[commandModelKey].trim()) {
      finalModel = preferences[commandModelKey];
    }

    // Get command-specific prompt
    const commandPromptKey = `${commandName}Prompt`;
    if (preferences[commandPromptKey] && preferences[commandPromptKey].trim()) {
      finalCustomPrompt = preferences[commandPromptKey];
    }
  }

  const systemPrompt = customSystemPrompt || template.system;
  const userPrompt = finalCustomPrompt
    ? finalCustomPrompt.replace("{text}", text)
    : template.user.replace("{text}", text);

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  // Determine if using OpenRouter based on model name (automatic detection)
  const shouldUseOpenRouter = !finalModel.startsWith("gpt-");

  if (shouldUseOpenRouter && openrouterApiKey) {
    return await sendOpenRouterRequest(
      messages,
      finalModel,
      temperature,
      maxTokens,
      openrouterApiKey,
    );
  } else if (openaiApiKey) {
    return await sendOpenAIRequest(
      messages,
      finalModel,
      temperature,
      maxTokens,
      openaiApiKey,
    );
  } else {
    throw new Error("No API key configured");
  }
}

async function sendOpenAIRequest(
  messages: Array<{ role: "system" | "user"; content: string }>,
  model: string,
  temperature: number,
  maxTokens: number,
  apiKey: string,
): Promise<string | null> {
  const openai = new OpenAI({ apiKey });

  try {
    // GPT-5 models don't support temperature and max_tokens parameters
    const isGPT5 = model === "gpt-5" || model === "gpt-5-mini";

    const requestOptions: any = {
      model,
      messages,
    };

    if (!isGPT5) {
      requestOptions.temperature = temperature;
      requestOptions.max_tokens = maxTokens;
    }

    const response = await openai.chat.completions.create(requestOptions);

    return response.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(
      `OpenAI API error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function sendOpenRouterRequest(
  messages: Array<{ role: "system" | "user"; content: string }>,
  model: string,
  temperature: number,
  maxTokens: number,
  apiKey: string,
): Promise<string | null> {
  const url = "https://openrouter.ai/api/v1/chat/completions";
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // GPT-5 models don't support temperature and max_tokens parameters
  const isGPT5 = model === "gpt-5" || model === "gpt-5-mini";

  const payload: any = {
    model,
    messages,
  };

  if (!isGPT5) {
    payload.temperature = temperature;
    payload.max_tokens = maxTokens;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error("OpenRouter API error:", error);
    throw new Error(
      `OpenRouter API error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export function getAvailableActions(): string[] {
  return Object.keys(PROMPT_TEMPLATES);
}

export function getActionDescription(action: string): string {
  const descriptions: Record<string, string> = {
    normalRewrite: "Improve grammar and clarity",
    rewriteInWorkplaceTone: "Rewrite for workplace/Slack chat",
    response_positive: "Generate a positive reply",
    response_negative: "Generate a negative reply",
    humorrewrite: "Add humorous tone",
    shortner: "Shorten text",
    translateToTurkish: "Translate to Turkish",
    translateToPersian: "Translate to Persian",
    translateToEnglish: "Translate to English",
    translateToEnglishCasual: "Translate to casual English",
    translateToSpanish: "Translate to Spanish",
    generateQuestions: "Generate questions",
    suggestImprovements: "Suggest improvements",
    expandOnIdeas: "Expand ideas",
    convertToBulletPoints: "Convert to bullet points",
    generateTitle: "Generate title",
    summarizeText: "Summarize text",
    identifyKeyPoints: "Identify key points",
    generalQuestion: "General question",
  };
  return descriptions[action] || action;
}
