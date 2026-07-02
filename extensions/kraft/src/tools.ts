import { ToolMode } from "./runtime/types";
import { WorkflowStepId } from "./runtime/tool-runtime";
import { defaultToolSettings, ToolRenderer } from "./tool-settings";
import { ToolIconName } from "./tool-icons";

export type ToolKind = "execution" | "input" | "configuration";
export type ToolSectionId = "text" | "input" | "configuration";

export interface ToolLaunch {
  command: string;
  context?: Record<string, unknown>;
}

export interface ToolDefinition {
  id: string;
  icon?: ToolIconName;
  title: string;
  subtitle: string;
  description: string;
  kind: ToolKind;
  section: ToolSectionId;
  mode?: ToolMode;
  workflow?: WorkflowStepId[];
  defaultPrompt?: string;
  defaultRenderer?: ToolRenderer;
  defaultConversationEnabled?: boolean;
  launch: ToolLaunch;
}

export interface ToolSection {
  id: ToolSectionId;
  title: string;
  tools: ToolDefinition[];
}

export const executionTools: ToolDefinition[] = [
  {
    id: "translate",
    title: "Translate",
    subtitle: "Translate text between languages",
    description: "Use the configured AI runtime to translate text.",
    kind: "execution",
    section: "text",
    mode: "translate",
    workflow: defaultToolSettings.translate.workflow,
    defaultPrompt: defaultToolSettings.translate.prompt,
    defaultRenderer: defaultToolSettings.translate.renderer,
    defaultConversationEnabled: defaultToolSettings.translate.enableConversation,
    launch: { command: "translate", context: { mode: "translate", autoStart: false } },
  },
  {
    id: "polishing",
    title: "Polish Writing",
    subtitle: "Improve clarity and tone",
    description: "Rewrite text with this tool's prompt and model.",
    kind: "execution",
    section: "text",
    mode: "polishing",
    workflow: defaultToolSettings.polishing.workflow,
    defaultPrompt: defaultToolSettings.polishing.prompt,
    defaultRenderer: defaultToolSettings.polishing.renderer,
    defaultConversationEnabled: defaultToolSettings.polishing.enableConversation,
    launch: { command: "kraft", context: { mode: "polishing", autoStart: false } },
  },
  {
    id: "summarize",
    title: "Summarize",
    subtitle: "Condense long text",
    description: "Summarize pasted, selected, or OCR text with the active model.",
    kind: "execution",
    section: "text",
    mode: "summarize",
    workflow: defaultToolSettings.summarize.workflow,
    defaultPrompt: defaultToolSettings.summarize.prompt,
    defaultRenderer: defaultToolSettings.summarize.renderer,
    defaultConversationEnabled: defaultToolSettings.summarize.enableConversation,
    launch: { command: "kraft", context: { mode: "summarize", autoStart: false } },
  },
  {
    id: "what",
    title: "Identify or Explain",
    subtitle: "Ask what something is",
    description: "Identify a term, passage, object, or OCR result.",
    kind: "execution",
    section: "text",
    mode: "what",
    workflow: defaultToolSettings.what.workflow,
    defaultPrompt: defaultToolSettings.what.prompt,
    defaultRenderer: defaultToolSettings.what.renderer,
    defaultConversationEnabled: defaultToolSettings.what.enableConversation,
    launch: { command: "kraft", context: { mode: "what", autoStart: false } },
  },
];

export const inputTools: ToolDefinition[] = [
  {
    id: "selected",
    title: "Ask About Selected Text",
    subtitle: "Use text from the frontmost app",
    description: "Capture selected text, then choose a tool or workflow.",
    kind: "input",
    section: "input",
    launch: { command: "selected" },
  },
  {
    id: "clipboard",
    title: "Ask About Clipboard",
    subtitle: "Use clipboard text",
    description: "Capture clipboard text, then choose a tool or workflow.",
    kind: "input",
    section: "input",
    launch: { command: "clipboard" },
  },
  {
    id: "ocr",
    title: "Ask About Screenshot",
    subtitle: "Capture text with OCR",
    description: "Extract text from a selected image region and send it to an AI tool.",
    kind: "input",
    section: "input",
    launch: { command: "ocr" },
  },
];

export const configurationTools: ToolDefinition[] = [
  {
    id: "tool-manager",
    title: "Text Tool Manager",
    subtitle: "Create and edit text tools",
    description: "Manage custom text tools inside Kraft.",
    kind: "configuration",
    section: "configuration",
    launch: { command: "tool-manager" },
  },
  {
    id: "app-settings",
    title: "App Settings",
    subtitle: "Language, input, output, history, proxy, and OCR",
    description: "Configure Kraft behavior inside the extension.",
    kind: "configuration",
    section: "configuration",
    launch: { command: "app-settings" },
  },
  {
    id: "api-settings",
    title: "API Settings",
    subtitle: "API base, key, and compatibility",
    description: "Configure and validate OpenAI or Anthropic API access.",
    kind: "configuration",
    section: "configuration",
    launch: { command: "api-settings" },
  },
];

export const menuSections: ToolSection[] = [
  { id: "text", title: "Text Tools", tools: executionTools },
  { id: "input", title: "Input Sources", tools: inputTools },
  { id: "configuration", title: "Configuration", tools: configurationTools },
];

export const allTools = menuSections.flatMap((section) => section.tools);

export function getToolById(id: string): ToolDefinition | undefined {
  return allTools.find((tool) => tool.id === id);
}
