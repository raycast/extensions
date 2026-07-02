import { BuiltInToolMode, ToolMode } from "./runtime/types";
import { WorkflowStepId } from "./runtime/tool-runtime";

export type ToolRenderer = "markdown" | "plain";

export interface ToolSetting {
  model: string;
  customModel: string;
  prompt: string;
  renderer: ToolRenderer;
  enableConversation: boolean;
  workflow: WorkflowStepId[];
}

export type ToolSettings = Record<string, ToolSetting>;

export const defaultWorkflow: WorkflowStepId[] = ["input", "prompt", "llm", "renderer"];

export const defaultToolSettings: Record<BuiltInToolMode, ToolSetting> = {
  translate: {
    model: "",
    customModel: "",
    prompt:
      "Translate {{input}} from {{sourceLang}} to {{targetLang}}. Preserve meaning, tone, formatting, and only return the translation.",
    renderer: "markdown",
    enableConversation: false,
    workflow: defaultWorkflow,
  },
  polishing: {
    model: "",
    customModel: "",
    prompt:
      "Polish the following {{sourceLang}} text for clarity, flow, and professional tone. Return only the revised text.\n\n{{input}}",
    renderer: "markdown",
    enableConversation: false,
    workflow: defaultWorkflow,
  },
  summarize: {
    model: "",
    customModel: "",
    prompt: "Summarize the following content in {{targetLang}}. Keep the result concise and structured.\n\n{{input}}",
    renderer: "markdown",
    enableConversation: false,
    workflow: defaultWorkflow,
  },
  what: {
    model: "",
    customModel: "",
    prompt:
      "Explain or identify the following content in {{targetLang}}. Use Markdown with clear sections.\n\n{{input}}\n\nConversation context:\n{{conversation}}",
    renderer: "markdown",
    enableConversation: true,
    workflow: [...defaultWorkflow, "conversation"],
  },
};

export function createDefaultToolSetting(patch: Partial<ToolSetting> = {}): ToolSetting {
  return {
    model: "",
    customModel: "",
    prompt: "{{input}}",
    renderer: "markdown",
    enableConversation: false,
    workflow: defaultWorkflow,
    ...patch,
  };
}

export function getDefaultToolSetting(mode: ToolMode): ToolSetting {
  if (mode in defaultToolSettings) {
    return defaultToolSettings[mode as BuiltInToolMode];
  }
  return createDefaultToolSetting();
}

export function mergeToolSettings(stored: Partial<Record<string, Partial<ToolSetting>>>): ToolSettings {
  return {
    translate: { ...defaultToolSettings.translate, ...stored.translate },
    polishing: { ...defaultToolSettings.polishing, ...stored.polishing },
    summarize: { ...defaultToolSettings.summarize, ...stored.summarize },
    what: { ...defaultToolSettings.what, ...stored.what },
    ...Object.fromEntries(
      Object.entries(stored)
        .filter(([mode]) => mode.startsWith("custom:"))
        .map(([mode, setting]) => [mode, createDefaultToolSetting(setting)]),
    ),
  };
}

export function resolveToolModel(setting: ToolSetting): string {
  return setting.customModel.trim() || setting.model.trim();
}
