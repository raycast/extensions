import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as React from "react";
import { CommandAnswer } from "./lib/settings/enum";
import { COMMANDS_INFO } from "./lib/settings/defaultPrompts";
import { DeleteSettingsCommandAnswer, GetSettingsCommandAnswer } from "./lib/settings/settings";
import { EditModel } from "./lib/ui/AnswerView/form/EditModel";
import { ThinkingEffort as ThinkingEffortOllama } from "./lib/ollama/types";

export default function Command(): React.JSX.Element {
  const {
    data: commands,
    isLoading,
    revalidate,
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
      try {
        const settings = await GetSettingsCommandAnswer(command);
        hasCustomSettings = true;
        server = settings.server;
        model = settings.model.main.tag;
        thinking = settings.model.main.thinking === false ? "false" : (settings.model.main.thinking as string);
        keep_alive = settings.model.main.keep_alive;
        customPrompt = settings.prompt;
      } catch {
        // Not configured yet
      }
      list.push({
        command,
        title: info.title,
        description: info.description,
        defaultPrompt: info.defaultPrompt,
        capabilities: info.capabilities,
        hasCustomSettings,
        server,
        model,
        thinking,
        keep_alive,
        customPrompt,
      });
    }
    return list;
  });

  async function handleReset(command: CommandAnswer) {
    try {
      await DeleteSettingsCommandAnswer(command);
      await showToast({
        style: Toast.Style.Success,
        title: "Reset successful",
        message: "Command settings reset to default",
      });
      revalidate();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error resetting settings",
        message: String(e),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search AI commands...">
      {commands?.map((item) => {
        const promptPreview = item.customPrompt || item.defaultPrompt;
        const subtitle = item.description;

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
            tag: { value: "Custom Prompt", color: "blue" },
            tooltip: "Using a customized prompt template",
          });
        } else {
          accessories.push({
            tag: { value: "Default Prompt", color: "gray" },
            tooltip: "Using the default prompt template",
          });
        }

        if (item.thinking && item.thinking !== "false") {
          accessories.push({
            tag: { value: `Thinking: ${item.thinking}`, color: "purple" },
          });
        }

        return (
          <List.Item
            key={item.command}
            title={item.title}
            subtitle={subtitle}
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
                        revalidate={revalidate}
                        capabilities={item.capabilities}
                        server={item.server}
                        model={item.model}
                        thinking={item.thinking === "false" ? false : (item.thinking as ThinkingEffortOllama)}
                        keep_alive={item.keep_alive}
                        prompt={item.customPrompt || item.defaultPrompt}
                      />
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
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
