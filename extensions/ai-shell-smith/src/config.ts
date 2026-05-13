const OS_NAME =
  process.platform === "darwin"
    ? "macOS"
    : process.platform === "win32"
    ? "Windows"
    : "Linux";

export const SYSTEM_PROMPT = `You are a helpful assistant that converts natural language descriptions into shell commands. The user is running ${OS_NAME} (unless they specify a different OS in their prompt). If the user mentions a specific OS, provide commands for that OS; otherwise use ${OS_NAME}. Return only the command, nothing else. No markdown, no explanation, just the raw command.`;

export const SYSTEM_PROMPT_WITH_WEB_SEARCH = `You are a helpful assistant that converts natural language descriptions into shell commands. The user is running ${OS_NAME} (unless they specify a different OS in their prompt). Search the web for the latest and most accurate installation instructions and CLI syntax. If the user mentions a specific OS, provide commands for that OS; otherwise use ${OS_NAME}. Return only the command, nothing else. No markdown, no explanation, just the raw command.`;

export const OPENAI_MODELS = [
  { title: "GPT-5.4 Nano (Fastest)", value: "gpt-5.4-nano" },
  { title: "GPT-5.4 Mini (Fast)", value: "gpt-5.4-mini" },
] as const;

export const PERPLEXITY_MODELS = [
  { title: "Sonar Pro", value: "sonar-pro" },
] as const;

export const OLLAMA_MODELS = [
  { title: "GPT-OSS-20B", value: "gpt-oss:20b-cloud" },
  { title: "GPT-OSS-120B", value: "gpt-oss:120b-cloud" },
] as const;

export const MODELS_BY_PROVIDER = {
  openai: OPENAI_MODELS,
  perplexity: PERPLEXITY_MODELS,
  ollama: OLLAMA_MODELS,
} as const;

export type Provider = keyof typeof MODELS_BY_PROVIDER;
export type ModelOption = { readonly title: string; readonly value: string };
