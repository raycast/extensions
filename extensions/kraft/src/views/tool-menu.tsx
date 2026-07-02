import {
  Action,
  ActionPanel,
  confirmAlert,
  environment,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { deleteCustomToolByMode, isCustomToolMode } from "../custom-tools";
import { useApiSettings } from "../hooks/useApiSettings";
import { useAppSettings } from "../hooks/useAppSettings";
import { useCustomTools } from "../hooks/useCustomTools";
import { useToolSettings } from "../hooks/useToolSettings";
import { ToolDefinition, menuSections } from "../tools";
import ToolManager from "../tool-manager";
import { AppSettingsForm } from "./app-settings-form";
import { ApiSettingsForm } from "./api-settings-form";
import { ToolSettingsForm } from "./tool-settings-form";
import { getToolIcon } from "../tool-icons";

export type ToolMenuProps = {
  onOpenCurrentCommandTool?: (tool: ToolDefinition) => void;
};

const TOOL_ICONS: Record<string, Icon> = {
  translate: Icon.Globe,
  polishing: Icon.Pencil,
  summarize: Icon.Text,
  what: Icon.QuestionMark,
  selected: Icon.TextSelection,
  clipboard: Icon.Clipboard,
  ocr: Icon.Image,
  "tool-manager": Icon.Hammer,
  "app-settings": Icon.Gear,
  "api-settings": Icon.Gear,
};

function openTool(tool: ToolDefinition, onOpenCurrentCommandTool?: (tool: ToolDefinition) => void) {
  if (tool.kind === "execution" && onOpenCurrentCommandTool) {
    onOpenCurrentCommandTool(tool);
    return;
  }

  return launchCommand({
    name: tool.launch.command,
    type: LaunchType.UserInitiated,
    context: tool.launch.context,
  });
}

function actionTitle(tool: ToolDefinition) {
  if (tool.kind === "configuration") {
    return `Open ${tool.title}`;
  }
  return `Use ${tool.title}`;
}

async function deleteCustomTool(tool: ToolDefinition, reloadTools: () => Promise<void>) {
  if (!isCustomToolMode(tool.mode)) {
    return;
  }
  if (!(await confirmAlert({ title: "Delete Text Tool?", message: tool.title }))) {
    return;
  }
  const deleted = await deleteCustomToolByMode(environment.supportPath, tool.mode);
  await reloadTools();
  await showToast({
    title: deleted ? "Text tool deleted" : "Text tool was already removed",
    message: tool.title,
    style: deleted ? Toast.Style.Success : Toast.Style.Failure,
  });
}

export function ToolMenu({ onOpenCurrentCommandTool }: ToolMenuProps) {
  const apiSettings = useApiSettings();
  const appSettings = useAppSettings();
  const customTools = useCustomTools();
  const toolSettings = useToolSettings();
  const sections = menuSections.map((section) =>
    section.id === "text" ? { ...section, tools: [...section.tools, ...customTools.data] } : section,
  );

  return (
    <List
      key="tool-menu"
      isLoading={apiSettings.isLoading || appSettings.isLoading || toolSettings.isLoading || customTools.isLoading}
      searchBarPlaceholder="Search AI tools..."
      navigationTitle="AI Tools"
    >
      {sections.map((section) => (
        <List.Section key={section.id} title={section.title}>
          {section.tools.map((tool) => (
            <List.Item
              key={tool.id}
              icon={TOOL_ICONS[tool.id] ?? getToolIcon(tool)}
              title={tool.title}
              subtitle={tool.subtitle}
              accessories={[{ text: tool.kind === "execution" ? "Tool" : tool.kind === "input" ? "Input" : "Setup" }]}
              actions={
                <ActionPanel>
                  {tool.id === "tool-manager" ? (
                    <Action.Push
                      title={actionTitle(tool)}
                      icon={TOOL_ICONS[tool.id] ?? getToolIcon(tool)}
                      target={<ToolManager />}
                    />
                  ) : tool.id === "api-settings" || tool.id === "app-settings" ? (
                    <Action.Push
                      title={actionTitle(tool)}
                      icon={TOOL_ICONS[tool.id] ?? getToolIcon(tool)}
                      target={
                        tool.id === "api-settings" ? (
                          <ApiSettingsForm hook={apiSettings} />
                        ) : (
                          <AppSettingsForm hook={appSettings} />
                        )
                      }
                    />
                  ) : tool.kind === "configuration" ? (
                    <Action
                      title={actionTitle(tool)}
                      icon={TOOL_ICONS[tool.id] ?? getToolIcon(tool)}
                      onAction={() => openTool(tool, onOpenCurrentCommandTool)}
                    />
                  ) : (
                    <Action
                      title={actionTitle(tool)}
                      icon={TOOL_ICONS[tool.id] ?? Icon.CommandSymbol}
                      onAction={() => openTool(tool, onOpenCurrentCommandTool)}
                    />
                  )}
                  {tool.kind === "execution" && tool.mode && (
                    <Action.Push
                      title="Tool Settings"
                      icon={Icon.Gear}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                      target={
                        <ToolSettingsForm
                          tool={tool}
                          setting={
                            toolSettings.data[tool.mode] ?? {
                              model: "",
                              customModel: "",
                              prompt: tool.defaultPrompt ?? "{{input}}",
                              renderer: tool.defaultRenderer ?? "markdown",
                              enableConversation: tool.defaultConversationEnabled ?? false,
                              workflow: tool.workflow ?? ["input", "prompt", "llm", "renderer"],
                            }
                          }
                          onSave={toolSettings.updateToolSetting}
                        />
                      }
                    />
                  )}
                  {tool.kind === "execution" && isCustomToolMode(tool.mode) && (
                    <Action
                      title="Delete Text Tool"
                      icon={{ source: Icon.Trash, tintColor: "red" }}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                      onAction={() => deleteCustomTool(tool, customTools.reload)}
                    />
                  )}
                  {tool.kind !== "configuration" && (
                    <ActionPanel.Section title="Setup">
                      <Action.Push
                        title="Open App Settings"
                        icon={Icon.Gear}
                        shortcut={{ modifiers: ["cmd", "ctrl"], key: "," }}
                        target={<AppSettingsForm hook={appSettings} />}
                      />
                      <Action.Push
                        title="Open Api Settings"
                        icon={Icon.Gear}
                        shortcut={{ modifiers: ["cmd", "ctrl"], key: "p" }}
                        target={<ApiSettingsForm hook={apiSettings} />}
                      />
                    </ActionPanel.Section>
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
