import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { createDeeplink, usePromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { Chat, ChatSeed } from "./components/Chat";
import { CommandForm, commandIcon } from "./components/CommandForm";
import { runClaudeJson } from "./lib/claude";
import { attachmentLabel } from "./lib/conversations";
import { showError } from "./lib/errors";
import { addHistory, historyFromUsage } from "./lib/history";
import { modelLabel } from "./lib/models";
import { deleteCustomCommand, findCommand, loadCustomCommands } from "./lib/custom-commands";
import { AiCommand, BUILTIN_COMMANDS, MODE_TITLES, OutputMode, renderPrompt } from "./lib/presets";
import { instructionSystem, requestSystem, selectionMessage, TEXT_SCHEMA } from "./lib/prompts";
import { deliver, Input, readInput, restoreClipboard } from "./lib/quick";
import { settings } from "./lib/settings";
import { preserveWhitespace } from "./lib/text";
import { recordUsage } from "./lib/usage";

const RUN_TITLES: Record<OutputMode, string> = {
  view: "Run and Show Result",
  replace: "Run and Replace Selection",
  copy: "Run and Copy Result",
};

const MODE_ICONS: Record<OutputMode, Icon> = {
  view: Icon.Sidebar,
  replace: Icon.Switch,
  copy: Icon.CopyClipboard,
};

export default function Command(props: LaunchProps<{ launchContext?: { commandId?: string } }>) {
  const s = settings();
  const { push } = useNavigation();
  const { data: input, isLoading: reading } = usePromise(() => readInput(s.clipboardFallback).catch(() => null));
  const { data: custom = [], isLoading, revalidate } = usePromise(loadCustomCommands);
  const quickRun = props.launchContext?.commandId;
  const ran = useRef(false);
  /** One paid request at a time: a second Run would paste a competing result. */
  const running = useRef(false);

  // A quicklink passes the command id: run it straight away on the current selection.
  useEffect(() => {
    if (!quickRun || ran.current || reading || isLoading) return;
    ran.current = true;
    void findCommand(quickRun).then(async (command) => {
      if (command) await run(command, command.mode);
      else
        await showToast({
          style: Toast.Style.Failure,
          title: "Command not found",
          message: "It may have been deleted.",
        });
    });
  }, [quickRun, reading, isLoading]);

  async function clipboardText(command: AiCommand) {
    return command.prompt.includes("{clipboard}") ? ((await Clipboard.readText()) ?? "") : undefined;
  }

  async function run(command: AiCommand, mode: OutputMode) {
    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text selected",
        message: "Select or copy some text first.",
      });
      return;
    }
    if (mode === "view") {
      // The selection always travels as an attachment, so a retry or an edit keeps it.
      const { prompt } = renderPrompt(command, {
        selection: input.text,
        clipboard: await clipboardText(command),
        langs: s.langs,
        selectionPlaceholder: "the selected text (inside the <selected_text> tags)",
      });
      const seed: ChatSeed = {
        prompt: command.title,
        instruction: prompt,
        attachments: [{ kind: "selection", text: input.text, source: input.source }],
        send: true,
        model: command.model,
        effort: command.effort,
      };
      push(<Chat seed={seed} navigationTitle={command.title} />);
      return;
    }
    if (running.current) {
      await showToast({ style: Toast.Style.Failure, title: "A command is already running" });
      return;
    }
    running.current = true;
    try {
      await transform(command, mode, input, await clipboardText(command));
    } finally {
      running.current = false;
    }
  }

  async function transform(command: AiCommand, mode: "replace" | "copy", input: Input, clipboard?: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `${command.title}…` });
    try {
      const { prompt, inline } = renderPrompt(command, {
        selection: input.text,
        clipboard,
        langs: s.langs,
        tagSelection: true,
      });
      const { data, response } = await runClaudeJson<{ text: string }>({
        apiKey: s.apiKey,
        model: command.model ?? s.quickModel,
        effort: command.effort ?? "low",
        system: inline ? requestSystem() : instructionSystem(prompt),
        schema: TEXT_SCHEMA,
        messages: [{ role: "user", content: inline ? prompt : selectionMessage(input.text) }],
      });
      const output = preserveWhitespace(input.text, data.text);
      await recordUsage(response.usage);
      if (s.keepHistory)
        await addHistory(historyFromUsage("ai-commands", command.title, input.text, output, response.usage));
      await toast.hide();

      if (mode === "replace" && input.source === "selection") {
        await closeMainWindow();
        await deliver(input, output);
        await showHUD(`✓ ${command.title}`);
        await restoreClipboard(input, output, true);
      } else {
        await Clipboard.copy(output);
        await showHUD(`✓ ${command.title} · copied to clipboard`);
      }
    } catch (error) {
      await showError(error);
    }
  }

  async function remove(command: AiCommand) {
    const ok = await confirmAlert({
      title: "Delete Command?",
      message: command.title,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await deleteCustomCommand(command.id);
    revalidate();
  }

  function item(command: AiCommand) {
    const others = (Object.keys(RUN_TITLES) as OutputMode[]).filter((m) => m !== command.mode);
    const accessories: List.Item.Accessory[] = [];
    if (command.model) accessories.push({ tag: modelLabel(command.model) });
    accessories.push({ icon: MODE_ICONS[command.mode], tooltip: MODE_TITLES[command.mode] });
    return (
      <List.Item
        key={command.id}
        icon={commandIcon(command.icon)}
        title={command.title}
        subtitle={MODE_TITLES[command.mode]}
        keywords={[command.prompt.slice(0, 60)]}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title={RUN_TITLES[command.mode]}
                icon={MODE_ICONS[command.mode]}
                onAction={() => void run(command, command.mode)}
              />
              {others.map((mode) => (
                <Action
                  key={mode}
                  title={RUN_TITLES[mode]}
                  icon={MODE_ICONS[mode]}
                  onAction={() => void run(command, mode)}
                />
              ))}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.CreateQuicklink
                title="Create Quicklink"
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                quicklink={{
                  name: `Claude: ${command.title}`,
                  link: createDeeplink({ command: "ai-commands", context: { commandId: command.id } }),
                }}
              />
              <Action
                title="New Command"
                icon={Icon.PlusCircle}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => push(<CommandForm onSave={revalidate} />)}
              />
              {!command.builtin && (
                <Action
                  title="Edit Command"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  onAction={() => push(<CommandForm command={command} onSave={revalidate} />)}
                />
              )}
              <Action
                title={command.builtin ? "Duplicate and Edit" : "Duplicate Command"}
                icon={Icon.Duplicate}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
                onAction={() => push(<CommandForm command={command} duplicate onSave={revalidate} />)}
              />
              {!command.builtin && (
                <Action
                  title="Delete Command"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => void remove(command)}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  const groups = new Map<string, AiCommand[]>();
  for (const command of [...custom, ...BUILTIN_COMMANDS]) {
    const group = !command.builtin || !command.group ? "My Commands" : command.group;
    groups.set(group, [...(groups.get(group) ?? []), command]);
  }

  const inputNote = reading
    ? "Reading selection…"
    : input
      ? attachmentLabel({ kind: "selection", ...input })
      : "No text selected";

  return (
    <List isLoading={reading || isLoading} searchBarPlaceholder={`${inputNote} · Search commands…`}>
      {[...groups.entries()].map(([title, commands]) => (
        <List.Section key={title} title={title}>
          {commands.map(item)}
        </List.Section>
      ))}
    </List>
  );
}
