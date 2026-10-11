import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as React from "react";
import { ThinkingEffort as ThinkingEffortOllama } from "./lib/ollama/types";
import { COMMANDS_INFO } from "./lib/settings/defaultPrompts";
import { CommandAnswer } from "./lib/settings/enum";
import {
  DeleteCustomCommand,
  DeleteSettingsCommandAnswer,
  GetCustomCommands,
  getCustomCommandQuicklink,
  GetSettingsCommandAnswer,
} from "./lib/settings/settings";
import { CustomCommand } from "./lib/settings/types";
import { EditModel } from "./lib/ui/AnswerView/form/EditModel";
import { CustomCommandForm } from "./lib/ui/CustomCommandForm";

export default function Command(): React.JSX.Element {
  const {
    data: commands,
    isLoading: isLoadingBuiltin,
    revalidate: revalidateBuiltin,
  } = usePromise(async () => {
    const list = [];
    for (const command of Object.values(CommandAnswer)) {
      const info = COMMANDS_INFO[command];
      let hasCustomSettings = false;
      let server: string | undefined;
      let model: string | undefined;
      let thinking: string | undefined;
      let keep_alive: string | undefined;
      let customPrompt: string | undefined;
      let action: "view" | "replace" | undefined;
      try {
        const settings = await GetSettingsCommandAnswer(command);
        hasCustomSettings = true;
        server = settings.server;
        model = settings.model.main.tag;
        thinking = settings.model.main.thinking === false ? "false" : (settings.model.main.thinking as string);
        keep_alive = settings.model.main.keep_alive;
        customPrompt = settings.prompt;
        action = settings.action;
      } catch {
        // Not configured yet
      }
      list.push({
        command,
        title: info.title,
        icon: info.icon || "icon.png",
        description: info.description,
        defaultPrompt: info.defaultPrompt,
        capabilities: info.capabilities,
        hasCustomSettings,
        server,
        model,
        thinking,
        keep_alive,
        customPrompt,
        action,
      });
    }
    return list;
  });

  const {
    data: customCommands,
    isLoading: isLoadingCustom,
    revalidate: revalidateCustom,
  } = usePromise(GetCustomCommands, []);

  const isLoading = isLoadingBuiltin || isLoadingCustom;

  async function handleReset(command: CommandAnswer) {
    try {
      await DeleteSettingsCommandAnswer(command);
      await showToast({
        style: Toast.Style.Success,
        title: "Reset successful",
        message: "Command settings reset to default",
      });
      revalidateBuiltin();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error resetting settings",
        message: String(e),
      });
    }
  }

  async function handleDeleteCustom(command: CustomCommand) {
    if (
      await confirmAlert({
        title: "Delete Custom Command",
        message: `Are you sure you want to delete "${command.title}"? Any quicklink referencing ID "${command.id}" will stop working.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await DeleteCustomCommand(command.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Command Deleted",
          message: `"${command.title}" deleted successfully`,
        });
        revalidateCustom();
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error deleting command",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  async function handleRunCustomCommand(item: CustomCommand) {
    try {
      await launchCommand({
        name: "cmd-answer",
        type: LaunchType.UserInitiated,
        arguments: { id: item.id },
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error running command",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search AI commands...">
      {customCommands?.map((item) => {
        const accessories: List.Item.Accessory[] = [
          {
            tag: { value: item.id, color: Color.SecondaryText },
            tooltip: `Quicklink ID: ${item.id}`,
          },
          {
            text: `${item.server}: ${item.model}`,
            tooltip: "Configured Server & Model",
          },
          item.action === "replace"
            ? {
                tag: { value: "Replace Selection", color: Color.Orange },
                tooltip: "Replaces the selected text directly instead of opening a view",
              }
            : {
                tag: { value: "Show View", color: Color.Green },
                tooltip: "Opens a view to display the AI response",
              },
        ];

        if (item.thinking && item.thinking !== "false") {
          accessories.push({
            tag: { value: `Thinking: ${item.thinking}`, color: Color.Purple },
            tooltip: `Thinking effort: ${item.thinking}`,
          });
        }

        return (
          <List.Item
            key={`custom_${item.id}`}
            icon={Icon.Terminal}
            title={item.title}
            subtitle={item.prompt.length > 50 ? `${item.prompt.substring(0, 50)}...` : item.prompt}
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Configure Settings"
                    icon={Icon.Gear}
                    target={<CustomCommandForm command={item} revalidate={revalidateCustom} />}
                  />
                  <Action.CreateQuicklink
                    title="Create Quicklink"
                    icon={Icon.Link}
                    quicklink={{
                      name: item.title,
                      link: getCustomCommandQuicklink(item.id),
                    }}
                  />
                  <Action
                    title="Run Command"
                    icon={Icon.Play}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => handleRunCustomCommand(item)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Create New Custom Command"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={<CustomCommandForm revalidate={revalidateCustom} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Quicklink URL"
                    icon={Icon.CopyClipboard}
                    content={getCustomCommandQuicklink(item.id)}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CopyToClipboard
                    title="Copy Prompt"
                    content={item.prompt}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action
                    title="Delete Custom Command"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => handleDeleteCustom(item)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}

      {commands?.map((item) => {
        const promptPreview = item.customPrompt || item.defaultPrompt;

        const accessories: List.Item.Accessory[] = [];
        if (item.hasCustomSettings) {
          accessories.push({
            text: `${item.server}: ${item.model}`,
            tooltip: "Configured Server & Model",
          });
        } else {
          accessories.push({
            text: "No custom model",
            tooltip: "Using fallback model configured when running the command",
          });
        }

        if (item.customPrompt) {
          accessories.push({
            tag: { value: "Custom Prompt", color: "green" },
            tooltip: "Using a customized prompt template",
          });
        } else {
          accessories.push({
            tag: { value: "Default Prompt", color: "gray" },
            tooltip: "Using the default prompt template",
          });
        }

        if (item.action === "replace") {
          accessories.push({
            tag: { value: "Replace Selection", color: "orange" },
            tooltip: "Replaces the selected text directly instead of opening a view",
          });
        } else {
          accessories.push({
            tag: { value: "Show View", color: "green" },
            tooltip: "Opens a view to display the AI response",
          });
        }

        if (item.thinking && item.thinking !== "false") {
          accessories.push({
            tag: { value: `Thinking: ${item.thinking}`, color: "purple" },
          });
        }

        return (
          <List.Item
            key={`builtin_${item.command}`}
            icon={item.icon || "icon.png"}
            title={item.title}
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Configure Settings"
                    icon={Icon.Gear}
                    target={
                      <EditModel
                        command={item.command}
                        revalidate={revalidateBuiltin}
                        capabilities={item.capabilities}
                        server={item.server}
                        model={item.model}
                        thinking={item.thinking === "false" ? false : (item.thinking as ThinkingEffortOllama)}
                        keep_alive={item.keep_alive}
                        prompt={item.customPrompt || item.defaultPrompt}
                        action={item.action}
                      />
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Custom Command"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={<CustomCommandForm revalidate={revalidateCustom} />}
                  />
                  {item.hasCustomSettings && (
                    <Action
                      title="Reset to Defaults"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleReset(item.command)}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Active Prompt"
                    content={promptPreview}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CopyToClipboard
                    title="Copy Default Prompt"
                    content={item.defaultPrompt}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
