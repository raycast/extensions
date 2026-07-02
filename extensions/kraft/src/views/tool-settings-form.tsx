import { environment, showToast, Toast } from "@raycast/api";
import { CustomTextTool, customToolMode, readCustomToolsFile, writeCustomToolsFile } from "../custom-tools";
import { ToolMode } from "../runtime/types";
import { normalizeToolIconName } from "../tool-icons";
import { defaultWorkflow, ToolSetting } from "../tool-settings";
import { ToolDefinition } from "../tools";
import {
  TextToolForm,
  TextToolFormTool,
  TextToolFormValues,
  textToolFromValues,
  textToolSettingPatch,
} from "./text-tool-form";

export interface ToolSettingsFormProps {
  tool: ToolDefinition;
  setting: ToolSetting;
  onSave: (mode: ToolMode, patch: Partial<ToolSetting>) => Promise<void>;
}

function customIdFromMode(mode: ToolMode | undefined) {
  return typeof mode === "string" && mode.startsWith("custom:") ? mode.slice("custom:".length) : undefined;
}

function formToolFromDefinition(tool: ToolDefinition, setting: ToolSetting): TextToolFormTool {
  const customId = customIdFromMode(tool.mode);
  return {
    id: customId ?? tool.id,
    icon: normalizeToolIconName(tool.icon),
    title: tool.title,
    subtitle: tool.subtitle,
    description: tool.description,
    model: setting.model,
    customModel: setting.customModel,
    prompt: setting.prompt || tool.defaultPrompt || "{{input}}",
    renderer: setting.renderer || tool.defaultRenderer || "markdown",
    enableConversation: setting.enableConversation ?? tool.defaultConversationEnabled ?? false,
    workflow: setting.workflow?.length ? setting.workflow : tool.workflow || defaultWorkflow,
    mode: tool.mode,
    isSystem: !customId,
  };
}

async function updateCustomTool(tool: ToolDefinition, setting: ToolSetting, values: TextToolFormValues) {
  const customId = customIdFromMode(tool.mode);
  if (!customId) {
    return;
  }

  const stored = await readCustomToolsFile(environment.supportPath);
  const current =
    stored.tools.find((item) => item.id === customId) ??
    ({
      id: customId,
      icon: normalizeToolIconName(tool.icon),
      title: tool.title,
      subtitle: tool.subtitle,
      description: tool.description,
      model: setting.model,
      customModel: setting.customModel,
      prompt: setting.prompt,
      renderer: setting.renderer,
      enableConversation: setting.enableConversation,
      workflow: setting.workflow?.length ? setting.workflow : defaultWorkflow,
    } satisfies CustomTextTool);

  const nextId = values.id.trim() || customId;
  const duplicate = stored.tools.some((item) => item.id === nextId && item.id !== customId);
  if (duplicate) {
    await showToast({
      title: "Tool ID already exists",
      message: nextId,
      style: Toast.Style.Failure,
    });
    throw new Error("Tool ID already exists");
  }

  const nextTool = textToolFromValues(values, current, nextId);
  const nextTools = stored.tools.some((item) => item.id === customId)
    ? stored.tools.map((item) => (item.id === customId ? nextTool : item))
    : [nextTool, ...stored.tools];

  await writeCustomToolsFile(environment.supportPath, { version: 1, tools: nextTools });
}

export function ToolSettingsForm({ tool, setting, onSave }: ToolSettingsFormProps) {
  const formTool = formToolFromDefinition(tool, setting);

  return (
    <TextToolForm
      tool={formTool}
      navigationTitle={`Edit ${tool.title}`}
      submitTitle="Save Text Tool"
      onSubmit={async (values) => {
        if (customIdFromMode(tool.mode)) {
          await updateCustomTool(tool, setting, values);
          const nextMode = customToolMode(values.id);
          await onSave(nextMode, textToolSettingPatch(values));
          return;
        }
        if (!tool.mode) {
          return;
        }
        await onSave(tool.mode, textToolSettingPatch(values));
      }}
    />
  );
}
