import fetch from "node-fetch";

export interface GitHubModel {
  id: string;
  name: string;
  publisher: string;
  registry: string;
  summary?: string;
  html_url?: string;
  version?: string;
  capabilities?: string[]; // e.g., ["streaming", "tool-calling"]
  limits?: {
    max_input_tokens?: number;
    max_output_tokens?: number;
  };
  rate_limit_tier?: string;
  supported_input_modalities?: string[]; // ["text", "image", "audio"]
  supported_output_modalities?: string[]; // ["text"]
  tags?: string[]; // ["multipurpose", ...]
}

export type GitHubContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export type GitHubContent = string | GitHubContentPart[];

export interface GitHubChatMessage {
  role: "system" | "user" | "assistant";
  content: GitHubContent;
}

export interface GitHubToolFunction {
  name: string;
  description?: string;
  parameters?: any; // JSON schema
}

export interface GitHubTool {
  type: "function";
  function: GitHubToolFunction;
}

export interface GitHubToolCall {
  type: "function";
  function: { name: string; arguments: string };
}

export interface GitHubChatResponseMessage {
  role: string;
  content: string;
  tool_calls?: GitHubToolCall[];
}

export interface GitHubChatResponse {
  choices: Array<{
    message: GitHubChatResponseMessage;
  }>;
}

function ghHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function listCatalog(token: string): Promise<GitHubModel[]> {
  const res = await fetch("https://models.github.ai/catalog/models", {
    method: "GET",
    headers: ghHeaders(token),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub Models catalog error: ${res.status} ${text}`);
  }
  return (await res.json()) as GitHubModel[];
}

export async function chatCompletion(
  token: string,
  model: string,
  messages: GitHubChatMessage[],
  options?: { tools?: GitHubTool[]; tool_choice?: "auto" | "none" }
): Promise<GitHubChatResponse> {
  const body: any = { model, messages };
  if (options?.tools && options.tools.length > 0) body.tools = options.tools;
  if (options?.tool_choice) body.tool_choice = options.tool_choice;
  const res = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub Models chat error: ${res.status} ${text}`);
  }
  return (await res.json()) as GitHubChatResponse;
}
