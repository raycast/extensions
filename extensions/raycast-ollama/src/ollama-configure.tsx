import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as React from "react";
import { CommandAnswer } from "./lib/settings/enum";
import {
  GetResolvedSettingsCommandAnswer,
  GetSettingsCommandAnswer,
  SetSettingsCommandAnswer,
} from "./lib/settings/settings";
import { SettingsCommandAnswer } from "./lib/settings/types";
import { EditModel } from "./lib/ui/AnswerView/form/EditModel";
import { OllamaApiModelCapability } from "./lib/ollama/enum";

interface CommandConfig {
  command: CommandAnswer;
  title: string;
  subtitle: string;
  settings: SettingsCommandAnswer | null;
  hasCustom: boolean;
}

const COMMAND_METADATA: Record<CommandAnswer, { title: string; subtitle: string }> = {
  [CommandAnswer.CASUAL]: { title: "Change Tone to Casual", subtitle: "Make selected text more casual" },
  [CommandAnswer.CODE_EXPLAIN]: {
    title: "Explain Code Step by Step",
    subtitle: "Explain the selected code step by step",
  },
  [CommandAnswer.CONFIDENT]: { title: "Change Tone to Confident", subtitle: "Make selected text more confident" },
  [CommandAnswer.EXPLAIN]: { title: "Explain This in Simple Terms", subtitle: "Explain selected text in simple terms" },
  [CommandAnswer.FIX]: {
    title: "Fix Spelling and Grammar",
    subtitle: "Fix selected text from spelling and grammar error",
  },
  [CommandAnswer.FRIENDLY]: { title: "Change Tone to Friendly", subtitle: "Make selected text more friendly" },
  [CommandAnswer.IMAGE_DESCRIBE]: { title: "Describe Content of Image", subtitle: "Describe content of the image" },
  [CommandAnswer.IMAGE_TO_TEXT]: { title: "Get Text from Image", subtitle: "Get text from image" },
  [CommandAnswer.IMPROVE]: { title: "Improve Writing", subtitle: "Improve writing of selected text" },
  [CommandAnswer.LONGER]: { title: "Make Longer", subtitle: "Make selected text longer" },
  [CommandAnswer.PROFESSIONAL]: {
    title: "Change Tone to Professional",
    subtitle: "Make selected text more professional",
  },
  [CommandAnswer.SHORTER]: { title: "Make Shorter", subtitle: "Make selected text shorter" },
  [CommandAnswer.TRANSLATE]: { title: "Translate", subtitle: "Translate selected text" },
  [CommandAnswer.TWEET]: { title: "Rephrase as Tweet", subtitle: "Rephrase selected text as Tweet" },
};

function formatThinking(thinking: boolean | string | undefined): string {
  if (!thinking || (typeof thinking === "boolean" && !thinking) || thinking === "false" || thinking === "none")
    return "None";
  const t = String(thinking);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function getResolvedSettings(settings: SettingsCommandAnswer | null, hasCustom: boolean) {
  if (hasCustom && settings) return settings;
  return { server: "Local", model: { main: { tag: "", thinking: false, keep_alive: "5m" } } } as SettingsCommandAnswer;
}

function formatKeepAlive(keepAlive: string | undefined): string {
  return keepAlive || "5m";
}

export default function ConfigureModels(): React.JSX.Element {
  const [showEditForm, setShowEditForm] = React.useState(false);
  const [editCommand, setEditCommand] = React.useState<CommandAnswer | null>(null);
  const [editCapabilities, setEditCapabilities] = React.useState<OllamaApiModelCapability[] | undefined>(undefined);

  const { data: AllCommands, isLoading } = usePromise(async () => {
    const commands: CommandConfig[] = [];
    for (const [command, meta] of Object.entries(COMMAND_METADATA)) {
      const cmd = command as CommandAnswer;
      try {
        const settings = await GetSettingsCommandAnswer(cmd);
        const hasCustom = !!settings.model.main.tag;
        commands.push({ command: cmd, title: meta.title, subtitle: meta.subtitle, settings, hasCustom });
      } catch {
        const resolved = await GetResolvedSettingsCommandAnswer(cmd);
        commands.push({
          command: cmd,
          title: meta.title,
          subtitle: meta.subtitle,
          settings: { server: resolved.server, model: resolved.model },
          hasCustom: false,
        });
      }
    }
    return commands;
  }, []);

  async function handleReset(command: CommandAnswer) {
    await SetSettingsCommandAnswer(command, {
      server: "",
      model: { main: { server: { url: "" }, tag: "" } },
    });
    await showToast({ style: Toast.Style.Success, title: "Reset to global defaults" });
  }

  function handleEdit(command: CommandAnswer, capabilities?: OllamaApiModelCapability[]) {
    setEditCommand(command);
    setEditCapabilities(capabilities);
    setShowEditForm(true);
  }

  if (showEditForm && editCommand) {
    return (
      <EditModel
        command={editCommand}
        setShow={setShowEditForm}
        revalidate={() => Promise.resolve()}
        capabilities={editCapabilities}
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      {AllCommands?.map((cmd) => {
        const settings = getResolvedSettings(cmd.settings, cmd.hasCustom);
        const modelTag = settings.model?.main?.tag || "(global default)";
        const thinking = settings.model?.main?.thinking;
        const keepAlive = settings.model?.main?.keep_alive;

        const accessories = cmd.hasCustom
          ? [{ icon: Icon.CheckCircle, color: "green" as const }]
          : [{ icon: Icon.Globe, color: "secondary" as const }];

        return (
          <List.Item
            key={cmd.command}
            title={cmd.title}
            subtitle={`${cmd.subtitle}  —  Model: ${modelTag}  |  Thinking: ${formatThinking(thinking)}  |  Keep Alive: ${formatKeepAlive(keepAlive)}`}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action title="Edit Settings" icon={Icon.Pencil} onAction={() => handleEdit(cmd.command)} />
                {cmd.hasCustom && (
                  <Action
                    title="Reset to Global Defaults"
                    icon={Icon.ArrowCounterClockwise}
                    onAction={() => handleReset(cmd.command)}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
