export interface Tool {
  id: string;
  title: string;
  prompt: string;
  model?: string;
  baseUrl?: string;
  placeholder?: string;
  followUpPlaceholder?: string;
  targetLanguage?: string;
  kind?: string;
}

export const builtInTools: Tool[] = [
  {
    id: "ask-ai",
    title: "Ask AI",
    placeholder: "Ask anything, then press Enter...",
    followUpPlaceholder: "Ask a follow-up question...",
    prompt:
      "You are a helpful assistant. Answer clearly and accurately. Use Markdown when helpful.",
  },
  {
    id: "dictionary",
    title: "AI Dictionary",
    placeholder: "Define a word or phrase...",
    followUpPlaceholder: "Ask about usage, examples, or another meaning...",
    prompt:
      "You are a dictionary and language tutor. For the supplied word or phrase, give its pronunciation, part of speech, concise definitions, natural example sentences, common collocations, and relevant synonyms. Explain in the user's language. If context is provided, prioritize that meaning.",
  },
  {
    id: "translator",
    title: "AI Translator",
    placeholder: "Type text to translate...",
    followUpPlaceholder:
      "Refine the translation or give another instruction...",
    prompt:
      "You are an expert translator. Translate the user's text into {{language}}. Preserve meaning, tone, formatting, and proper nouns. Output only the translation unless the user explicitly requests explanations.",
  },
  {
    id: "polisher",
    title: "AI Polish Text",
    placeholder: "Type text to polish...",
    followUpPlaceholder:
      "How should I refine it? For example: make it shorter...",
    prompt:
      "Polish the supplied text for grammar, clarity, concision, and natural phrasing while preserving its meaning, language, tone, and formatting. Do not invent facts. Output only the improved text unless the user asks for an explanation.",
  },
];

export interface ToolRegistry {
  tools: Tool[];
  deletedBuiltIns: string[];
}

export function mergeTools(
  saved: Tool[],
  deletedBuiltIns: string[] = [],
): Tool[] {
  const overrides = new Map(saved.map((tool) => [tool.id, tool]));
  return [
    ...builtInTools.map((tool) => ({ ...tool, ...overrides.get(tool.id) })),
    ...saved.filter(
      (tool) => !builtInTools.some((builtIn) => builtIn.id === tool.id),
    ),
  ].filter((tool) => !deletedBuiltIns.includes(tool.id));
}

export function deleteFromRegistry(
  registry: ToolRegistry,
  id: string,
): ToolRegistry {
  if (builtInTools.some((tool) => tool.id === id)) {
    return {
      ...registry,
      deletedBuiltIns: [...new Set([...registry.deletedBuiltIns, id])],
    };
  }
  return {
    ...registry,
    tools: registry.tools.filter((tool) => tool.id !== id),
  };
}

export function saveToRegistry(
  registry: ToolRegistry,
  tool: Tool,
): ToolRegistry {
  return {
    tools: [...registry.tools.filter((item) => item.id !== tool.id), tool],
    deletedBuiltIns: registry.deletedBuiltIns.filter((id) => id !== tool.id),
  };
}

export function createToolFromTemplate(templateId: string, id: string): Tool {
  const template = builtInTools.find((tool) => tool.id === templateId);
  if (!template) throw new Error("Choose an available command template.");
  return { ...template, id, kind: template.id, title: `My ${template.title}` };
}

export function renderPrompt(prompt: string, language: string): string {
  if (prompt.includes("{{language}}") && !language.trim()) {
    throw new Error(
      "Choose a target language in this tool before translating.",
    );
  }
  return prompt.replaceAll("{{language}}", language);
}

export function toolPlaceholder(
  tool: Tool,
  followUp: boolean,
  language = "",
): string {
  const value = followUp
    ? tool.followUpPlaceholder ||
      "Ask a follow-up or give another instruction..."
    : tool.placeholder || "Type your text, then press Enter...";
  return value.replaceAll("{{language}}", language || "your chosen language");
}

export function toolDeeplink(tool: Tool): string {
  const builtIn = builtInTools.some((candidate) => candidate.id === tool.id);
  const command = builtIn ? tool.id : "custom-tool";
  const query = builtIn
    ? ""
    : `?arguments=${encodeURIComponent(JSON.stringify({ tool: tool.id }))}`;
  return `raycast://extensions/edliu_microsoft/mae-ai/${command}${query}`;
}

export function normalizeBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl.trim());
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Provider URL must use http:// or https://.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "Use a plain provider base URL without credentials, query parameters, or a fragment.",
    );
  }
  url.pathname =
    url.pathname.replace(/\/+$/, "").replace(/\/chat\/completions$/, "") ||
    "/v1";
  return url.toString().replace(/\/$/, "");
}

export function completionUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/chat/completions`;
}
