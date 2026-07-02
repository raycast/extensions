import { promises as fs } from "fs";
import path from "path";
import { ToolIconName, normalizeToolIconName } from "./tool-icons";
import { ToolMode } from "./runtime/types";
import { WorkflowStepId } from "./runtime/tool-runtime";
import { createDefaultToolSetting, defaultWorkflow, ToolRenderer, ToolSetting } from "./tool-settings";
import { ToolDefinition } from "./tools";

export interface CustomTextTool {
  id: string;
  icon: ToolIconName;
  title: string;
  subtitle: string;
  description: string;
  model: string;
  customModel: string;
  prompt: string;
  renderer: ToolRenderer;
  enableConversation: boolean;
  workflow: WorkflowStepId[];
}

export interface CustomToolsFile {
  version: 1;
  tools: CustomTextTool[];
}

export const CUSTOM_TOOLS_FILE = "custom-tools.v1.json";

const fallbackTool: CustomTextTool = {
  id: "",
  icon: "Text",
  title: "New Text Tool",
  subtitle: "Custom text processor",
  description: "Run a custom AI text tool.",
  model: "",
  customModel: "",
  prompt: "{{input}}",
  renderer: "markdown",
  enableConversation: false,
  workflow: defaultWorkflow,
};

function filePath(supportPath: string) {
  return path.join(supportPath, CUSTOM_TOOLS_FILE);
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `tool-${Date.now()}`;
}

function isWorkflowStepId(value: unknown): value is WorkflowStepId {
  return value === "input" || value === "prompt" || value === "llm" || value === "renderer" || value === "conversation";
}

function sanitizeCustomTool(raw: Partial<CustomTextTool>): CustomTextTool {
  const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : fallbackTool.title;
  const id = typeof raw.id === "string" && raw.id.trim() ? slugify(raw.id) : slugify(title);
  const workflow = Array.isArray(raw.workflow) ? raw.workflow.filter(isWorkflowStepId) : fallbackTool.workflow;

  return {
    id,
    icon: normalizeToolIconName(raw.icon),
    title,
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle.trim() : fallbackTool.subtitle,
    description: typeof raw.description === "string" ? raw.description.trim() : fallbackTool.description,
    model: typeof raw.model === "string" ? raw.model.trim() : "",
    customModel: typeof raw.customModel === "string" ? raw.customModel.trim() : "",
    prompt: typeof raw.prompt === "string" && raw.prompt.trim() ? raw.prompt : fallbackTool.prompt,
    renderer: raw.renderer === "plain" ? "plain" : "markdown",
    enableConversation: Boolean(raw.enableConversation),
    workflow: workflow.length ? workflow : fallbackTool.workflow,
  };
}

function sanitizeCustomToolsFile(raw: unknown): CustomToolsFile {
  if (!raw || typeof raw !== "object" || !("tools" in raw) || !Array.isArray(raw.tools)) {
    return { version: 1, tools: [] };
  }

  const seen = new Set<string>();
  const tools = raw.tools
    .map((tool) => sanitizeCustomTool(tool as Partial<CustomTextTool>))
    .filter((tool) => {
      if (seen.has(tool.id)) {
        return false;
      }
      seen.add(tool.id);
      return true;
    });

  return { version: 1, tools };
}

export async function readCustomToolsFile(supportPath: string): Promise<CustomToolsFile> {
  try {
    const raw = await fs.readFile(filePath(supportPath), "utf8");
    return sanitizeCustomToolsFile(JSON.parse(raw));
  } catch {
    return { version: 1, tools: [] };
  }
}

export async function writeCustomToolsFile(supportPath: string, data: CustomToolsFile): Promise<CustomToolsFile> {
  const sanitized = sanitizeCustomToolsFile(data);
  await fs.mkdir(supportPath, { recursive: true });
  await fs.writeFile(filePath(supportPath), JSON.stringify(sanitized, null, 2), "utf8");
  return sanitized;
}

export function customToolMode(id: string): ToolMode {
  return `custom:${slugify(id)}` as ToolMode;
}

export function isCustomToolMode(mode: string | undefined): mode is ToolMode {
  return typeof mode === "string" && mode.startsWith("custom:");
}

export async function deleteCustomToolByMode(supportPath: string, mode: ToolMode) {
  const stored = await readCustomToolsFile(supportPath);
  const tools = stored.tools.filter((tool) => customToolMode(tool.id) !== mode);
  if (tools.length === stored.tools.length) {
    return false;
  }
  await writeCustomToolsFile(supportPath, { version: 1, tools });
  return true;
}

export function settingFromCustomTool(tool: CustomTextTool): ToolSetting {
  return createDefaultToolSetting({
    model: tool.model,
    customModel: tool.customModel,
    prompt: tool.prompt,
    renderer: tool.renderer,
    enableConversation: tool.enableConversation,
    workflow: tool.workflow,
  });
}

export function customToolToDefinition(tool: CustomTextTool): ToolDefinition {
  const mode = customToolMode(tool.id);
  const setting = settingFromCustomTool(tool);
  return {
    id: mode,
    title: tool.title,
    subtitle: tool.subtitle,
    description: tool.description,
    icon: tool.icon,
    kind: "execution",
    section: "text",
    mode,
    workflow: setting.workflow,
    defaultPrompt: setting.prompt,
    defaultRenderer: setting.renderer,
    defaultConversationEnabled: setting.enableConversation,
    launch: { command: "kraft", context: { mode, loadSelected: true, loadClipboard: true, autoStart: true } },
  };
}
