export type ProcessorKind = "builtin" | "prompt" | "llm" | "transform" | "render";
export type WorkflowStepId = "input" | "prompt" | "llm" | "renderer" | "conversation";

export type ConversationMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface WorkflowStep {
  id: WorkflowStepId;
  title: string;
  kind: ProcessorKind;
}

export interface ToolVariableInput {
  input: string;
  source: string;
  sourceLang: string;
  targetLang: string;
  toolName: string;
  now?: Date;
  timezone?: string;
  conversation?: ConversationMessage[];
}

export type ToolVariables = Record<string, string>;

export interface PromptMessageInput {
  systemPrompt: string;
  userPrompt: string;
  variables: ToolVariables;
  conversation?: ConversationMessage[];
  includeConversation?: boolean;
}

const workflowStepMap: Record<WorkflowStepId, WorkflowStep> = {
  input: { id: "input", title: "Input Normalizer", kind: "builtin" },
  prompt: { id: "prompt", title: "Prompt Variables", kind: "prompt" },
  llm: { id: "llm", title: "LLM Call", kind: "llm" },
  renderer: { id: "renderer", title: "Markdown Renderer", kind: "render" },
  conversation: { id: "conversation", title: "Conversation Memory", kind: "builtin" },
};

function formatConversation(conversation: ConversationMessage[] | undefined): string {
  return (conversation ?? []).map((message) => `${message.role}: ${message.content}`).join("\n");
}

export function buildToolVariables(input: ToolVariableInput): ToolVariables {
  const now = input.now ?? new Date();
  const timezone = input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    input: input.input,
    source: input.source,
    sourceLang: input.sourceLang,
    targetLang: input.targetLang,
    toolName: input.toolName,
    isoTime: now.toISOString(),
    localeTime: now.toLocaleString(undefined, { timeZone: timezone }),
    timezone,
    conversation: formatConversation(input.conversation),
  };
}

export function renderTemplate(template: string, variables: ToolVariables): string {
  return template.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => variables[key] ?? "");
}

export function resolveWorkflow(stepIds: WorkflowStepId[]): WorkflowStep[] {
  return stepIds.map((id) => workflowStepMap[id]);
}

export function buildPromptMessages(input: PromptMessageInput): ConversationMessage[] {
  return [
    {
      role: "system",
      content: renderTemplate(input.systemPrompt, input.variables),
    },
    ...(input.includeConversation ? input.conversation ?? [] : []),
    {
      role: "user",
      content: renderTemplate(input.userPrompt, input.variables),
    },
  ];
}
