import { Action, ActionPanel, confirmAlert, environment, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { CustomTextTool, readCustomToolsFile, writeCustomToolsFile } from "./custom-tools";
import { useToolSettings } from "./hooks/useToolSettings";
import { BuiltInToolMode } from "./runtime/types";
import { getToolIcon, normalizeToolIconName } from "./tool-icons";
import { defaultToolSettings, defaultWorkflow } from "./tool-settings";
import { executionTools, ToolDefinition } from "./tools";
import {
  TextToolForm,
  TextToolFormTool,
  TextToolFormValues,
  textToolFromValues,
  textToolSettingPatch,
} from "./views/text-tool-form";

function createTool(): CustomTextTool {
  return {
    id: `tool-${Date.now()}`,
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
}

function createToolFromSystemTool(tool: ToolDefinition): CustomTextTool {
  const mode = tool.mode as BuiltInToolMode;
  const setting = mode ? defaultToolSettings[mode] : undefined;
  return {
    id: `${tool.id}-copy`,
    icon: normalizeToolIconName("icon" in tool && tool.icon ? tool.icon : undefined),
    title: `${tool.title} Copy`,
    subtitle: tool.subtitle,
    description: tool.description,
    model: setting?.model ?? "",
    customModel: setting?.customModel ?? "",
    prompt: setting?.prompt ?? tool.defaultPrompt ?? "{{input}}",
    renderer: setting?.renderer ?? tool.defaultRenderer ?? "markdown",
    enableConversation: setting?.enableConversation ?? tool.defaultConversationEnabled ?? false,
    workflow: setting?.workflow ?? tool.workflow ?? defaultWorkflow,
  };
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `tool-${Date.now()}`;
}

async function saveTools(tools: CustomTextTool[]) {
  return writeCustomToolsFile(environment.supportPath, { version: 1, tools });
}

export default function Command() {
  const [tools, setTools] = useState<CustomTextTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toolSettings = useToolSettings();

  async function reload() {
    const stored = await readCustomToolsFile(environment.supportPath);
    setTools(stored.tools);
    setIsLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function duplicateTool(tool: CustomTextTool) {
    const copy = {
      ...tool,
      id: `${tool.id}-copy`,
      title: `${tool.title} Copy`,
    };
    await saveTools([copy, ...tools]);
    await reload();
    await showToast({ title: "Text tool duplicated", style: Toast.Style.Success });
  }

  async function duplicateSystemTool(tool: ToolDefinition) {
    const copy = createToolFromSystemTool(tool);
    await saveTools([copy, ...tools]);
    await reload();
    await showToast({ title: "System text tool copied", style: Toast.Style.Success });
  }

  async function deleteTool(tool: CustomTextTool) {
    if (!(await confirmAlert({ title: "Delete Text Tool?", message: tool.title }))) {
      return;
    }
    await saveTools(tools.filter((item) => item.id !== tool.id));
    await reload();
    await showToast({ title: "Text tool deleted", style: Toast.Style.Success });
  }

  function customToolForm(tool: CustomTextTool | undefined) {
    const current = tool ?? createTool();
    const isEditing = Boolean(tool);
    return (
      <TextToolForm
        tool={current}
        navigationTitle={isEditing ? `Edit ${current.title}` : "New Text Tool"}
        submitTitle={isEditing ? "Save Text Tool" : "Create Text Tool"}
        onSubmit={async (values: TextToolFormValues) => {
          const id = slugify(values.id || values.title);
          const duplicate = tools.some((item) => item.id === id && item.id !== tool?.id);
          if (duplicate) {
            await showToast({
              title: "Tool ID already exists",
              message: id,
              style: Toast.Style.Failure,
            });
            return;
          }
          const nextTool = textToolFromValues(values, current, id);
          const nextTools = isEditing
            ? tools.map((item) => (item.id === tool?.id ? nextTool : item))
            : [nextTool, ...tools];
          await saveTools(nextTools);
          await reload();
        }}
      />
    );
  }

  function systemToolForm(tool: ToolDefinition, currentSetting = defaultToolSettings[tool.mode as BuiltInToolMode]) {
    const formTool: TextToolFormTool = {
      id: tool.id,
      icon: "icon" in tool && tool.icon ? tool.icon : createToolFromSystemTool(tool).icon,
      title: tool.title,
      subtitle: tool.subtitle,
      description: tool.description,
      model: currentSetting.model,
      customModel: currentSetting.customModel,
      prompt: currentSetting.prompt,
      renderer: currentSetting.renderer,
      enableConversation: currentSetting.enableConversation,
      workflow: currentSetting.workflow,
      mode: tool.mode,
      isSystem: true,
    };

    return (
      <TextToolForm
        tool={formTool}
        navigationTitle={`Edit ${tool.title}`}
        submitTitle="Save Text Tool"
        onSubmit={async (values: TextToolFormValues) => {
          if (!tool.mode) {
            return;
          }
          await toolSettings.updateToolSetting(tool.mode, textToolSettingPatch(values));
        }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading || toolSettings.isLoading}
      searchBarPlaceholder="Search text tools..."
      navigationTitle="Text Tool Manager"
      actions={
        <ActionPanel>
          <Action.Push title="New Text Tool" icon={Icon.Plus} target={customToolForm(undefined)} />
        </ActionPanel>
      }
    >
      <List.Section title="System Text Tools" subtitle={executionTools.length.toLocaleString()}>
        {executionTools.map((tool) => {
          const setting = tool.mode ? toolSettings.data[tool.mode] : undefined;
          return (
            <List.Item
              key={tool.id}
              icon={getToolIcon(tool)}
              title={tool.title}
              subtitle={tool.subtitle}
              accessories={[
                { text: "System" },
                { text: setting?.enableConversation ? "Multi-turn" : "Single-turn" },
                { text: setting?.renderer === "plain" ? "Plain" : "Markdown" },
              ]}
              detail={
                <List.Item.Detail
                  markdown={`## ${tool.title}\n\n${tool.description}\n\n---\n\n${setting?.prompt ?? tool.defaultPrompt ?? ""}`}
                />
              }
              actions={
                <ActionPanel>
                  {tool.mode && (
                    <Action.Push
                      title="Edit Text Tool"
                      icon={Icon.Pencil}
                      target={systemToolForm(tool, setting ?? defaultToolSettings[tool.mode as BuiltInToolMode])}
                    />
                  )}
                  <Action
                    title="Duplicate as Custom Tool"
                    icon={Icon.CopyClipboard}
                    onAction={() => duplicateSystemTool(tool)}
                  />
                  <ActionPanel.Section title="Create">
                    <Action.Push title="New Text Tool" icon={Icon.Plus} target={customToolForm(undefined)} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Custom Text Tools" subtitle={tools.length.toLocaleString()}>
        {tools.map((tool) => (
          <List.Item
            key={tool.id}
            icon={getToolIcon({ icon: tool.icon })}
            title={tool.title}
            subtitle={tool.subtitle}
            accessories={[
              { text: "Custom" },
              { text: tool.enableConversation ? "Multi-turn" : "Single-turn" },
              { text: tool.renderer === "markdown" ? "Markdown" : "Plain" },
            ]}
            detail={<List.Item.Detail markdown={`## ${tool.title}\n\n${tool.description}\n\n---\n\n${tool.prompt}`} />}
            actions={
              <ActionPanel>
                <Action.Push title="Edit Text Tool" icon={Icon.Pencil} target={customToolForm(tool)} />
                <Action title="Duplicate Text Tool" icon={Icon.CopyClipboard} onAction={() => duplicateTool(tool)} />
                <Action
                  title="Delete Text Tool"
                  icon={{ source: Icon.Trash, tintColor: "red" }}
                  style={Action.Style.Destructive}
                  onAction={() => deleteTool(tool)}
                />
                <ActionPanel.Section title="Create">
                  <Action.Push title="New Text Tool" icon={Icon.Plus} target={customToolForm(undefined)} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
