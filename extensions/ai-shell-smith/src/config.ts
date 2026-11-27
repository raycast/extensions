const OS_NAME =
  process.platform === "darwin"
    ? "macOS"
    : process.platform === "win32"
      ? "Windows"
      : "Linux";

export const SYSTEM_PROMPT = `You are a helpful assistant that converts natural language descriptions into shell commands. The user is running ${OS_NAME} (unless they specify a different OS in their prompt). If the user mentions a specific OS, provide commands for that OS; otherwise use ${OS_NAME}. Reply with JSON only, no Markdown: {"commands":[{"command":"<runnable shell command>","platform":"macos|linux|windows|any","label":"<3-6 word description>","explanation":"<one sentence: what it does and any side effects>"}]}. Each command must be a complete solution on its own: chain required steps with && instead of splitting them into separate commands. Use "platform": "any" unless the command only works on one OS. Put the best command for the user's OS first. Add up to 3 alternatives only when they are genuinely different ways to do it (another package manager, installer or OS); otherwise return a single command. Every command must be runnable as-is, without placeholders when avoidable.`;

export const SYSTEM_PROMPT_WITH_WEB_SEARCH = `You are a helpful assistant that converts natural language descriptions into shell commands. The user is running ${OS_NAME} (unless they specify a different OS in their prompt). Search the web for the latest and most accurate installation instructions and CLI syntax. If the user mentions a specific OS, provide commands for that OS; otherwise use ${OS_NAME}. Reply with JSON only, no Markdown: {"commands":[{"command":"<runnable shell command>","platform":"macos|linux|windows|any","label":"<3-6 word description>","explanation":"<one sentence: what it does and any side effects>"}]}. Each command must be a complete solution on its own: chain required steps with && instead of splitting them into separate commands. Use "platform": "any" unless the command only works on one OS. Put the best command for the user's OS first. Add up to 3 alternatives only when they are genuinely different ways to do it (another package manager, installer or OS); otherwise return a single command. Every command must be runnable as-is, without placeholders when avoidable.`;

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

export const RAYCAST_AI_MODELS = [
  { title: "Raycast AI (Default)", value: "raycast-ai" },
] as const;

export const MODELS_BY_PROVIDER = {
  openai: OPENAI_MODELS,
  perplexity: PERPLEXITY_MODELS,
  ollama: OLLAMA_MODELS,
  raycast: RAYCAST_AI_MODELS,
} as const;

export type Provider = keyof typeof MODELS_BY_PROVIDER;
export type ModelOption = { readonly title: string; readonly value: string };
