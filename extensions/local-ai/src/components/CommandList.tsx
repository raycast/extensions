import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { useEffect, type ReactNode } from "react";
import { useCommands } from "../hooks/useCommands";
import {
  duplicateCommand,
  removeCommand,
  resetStarters,
  sortCommands,
  updateCommand,
} from "../lib/commands/operations";
import { starterCommands } from "../lib/commands/starters";
import { serializeExport } from "../lib/commands/transfer";
import type { AiCommand } from "../lib/commands/types";
import { getSettings } from "../services/settings";
import { commandIcon } from "./command-icon";
import { CommandForm } from "./CommandForm";
import { CreateQuicklinkAction } from "./CreateQuicklinkAction";
import { FeedbackAction } from "./FeedbackAction";
import { ImportCommandsForm } from "./ImportCommandsForm";

export { commandIcon } from "./command-icon";

const OUTPUT_LABELS = { replace: "Replace Selection", window: "Show in Window" } as const;
const QUICKLINK_HINT = "Assign a hotkey to this Quicklink in Raycast Settings, Extensions, Quicklinks or ⌘⇧L";

export function CommandList(props: { renderRunAction: (command: AiCommand) => ReactNode }) {
  const { commands, isLoading, readOnly, notice, mutate } = useCommands();
  const sorted = sortCommands(commands);
  const pinned = sorted.filter((command) => command.pinned);
  const others = sorted.filter((command) => !command.pinned);

  useEffect(() => {
    if (notice) void showToast({ style: Toast.Style.Failure, title: "Commands", message: notice });
  }, [notice]);

  function renderItem(command: AiCommand) {
    return (
      <List.Item
        key={command.id}
        title={command.name}
        icon={commandIcon(command)}
        detail={<List.Item.Detail markdown={detailMarkdown(command)} />}
        actions={
          <ActionPanel>
            <CommandActions
              command={command}
              commands={commands}
              readOnly={readOnly}
              mutate={mutate}
              runAction={props.renderRunAction(command)}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search commands">
      {!readOnly && (
        <List.Item
          id="create-new-command"
          title="Create New Command"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push title="Create New Command" icon={Icon.Plus} target={<CommandForm />} />
              </ActionPanel.Section>
              <TransferActions commands={commands} readOnly={readOnly} />
            </ActionPanel>
          }
        />
      )}
      <List.Section title="Pinned">{pinned.map(renderItem)}</List.Section>
      <List.Section title={pinned.length > 0 ? "Commands" : undefined}>{others.map(renderItem)}</List.Section>
    </List>
  );
}

function CommandActions(props: {
  command: AiCommand;
  commands: AiCommand[];
  readOnly: boolean;
  mutate: (change: (current: AiCommand[]) => AiCommand[]) => Promise<boolean>;
  runAction: ReactNode;
}) {
  const { command, commands, readOnly, mutate, runAction } = props;

  return (
    <>
      <ActionPanel.Section>{runAction}</ActionPanel.Section>
      {!readOnly && (
        <ActionPanel.Section>
          <Action.Push
            title="Edit Command"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<CommandForm command={command} />}
          />
          <Action.Push
            title="Create Command"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<CommandForm />}
          />
          <Action
            title="Duplicate Command"
            icon={Icon.CopyClipboard}
            shortcut={Keyboard.Shortcut.Common.Duplicate}
            onAction={() => {
              const copy = duplicateCommand(command, { id: randomUUID(), now: new Date().toISOString() });
              return mutate((current) => [...current, copy]);
            }}
          />
          <Action
            title={command.pinned ? "Unpin Command" : "Pin Command"}
            icon={command.pinned ? Icon.PinDisabled : Icon.Pin}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() =>
              mutate((current) =>
                current.map((item) =>
                  item.id === command.id
                    ? updateCommand(item, { pinned: !item.pinned }, new Date().toISOString())
                    : item,
                ),
              )
            }
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <CreateQuicklinkAction command={command} />
      </ActionPanel.Section>
      <TransferActions commands={commands} readOnly={readOnly} />
      {!readOnly && (
        <ActionPanel.Section>
          <Action
            title="Delete Command"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: `Delete "${command.name}"?`,
                message: "This cannot be undone.",
                primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
              });
              if (confirmed) await mutate((current) => removeCommand(current, command.id));
            }}
          />
          <Action
            title="Reset Starter Commands"
            icon={Icon.ArrowCounterClockwise}
            style={Action.Style.Destructive}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Reset starter commands?",
                message: "Starter commands return to their original settings. Your other commands are kept.",
                primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
              });
              if (!confirmed) return;
              const settings = getSettings();
              const starters = starterCommands(new Date().toISOString(), {
                model: settings.defaultModel,
                creativity: settings.defaultCreativity,
              });
              await mutate((current) => resetStarters(current, starters));
            }}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <FeedbackAction />
      </ActionPanel.Section>
    </>
  );
}

function TransferActions(props: { commands: AiCommand[]; readOnly: boolean }) {
  const { commands, readOnly } = props;

  return (
    <ActionPanel.Section>
      {!readOnly && <Action.Push title="Import Commands" icon={Icon.Download} target={<ImportCommandsForm />} />}
      <Action title="Export Commands" icon={Icon.Upload} onAction={() => exportCommands(commands)} />
      <Action
        title="Copy Export JSON"
        icon={Icon.Clipboard}
        onAction={async () => {
          await Clipboard.copy(serializeExport(commands));
          await showToast({ style: Toast.Style.Success, title: "Copied export JSON" });
        }}
      />
    </ActionPanel.Section>
  );
}

async function exportCommands(commands: AiCommand[]) {
  const date = new Date();
  const stamp = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
  const path = join(homedir(), "Downloads", `local-ai-commands-${stamp}.json`);
  try {
    await writeFile(path, serializeExport(commands), "utf8");
    await showInFinder(path);
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Could not write the export file" });
  }
}

function detailMarkdown(command: AiCommand): string {
  return [
    `**Output:** ${OUTPUT_LABELS[command.output]}`,
    "",
    "````",
    command.prompt,
    "````",
    "",
    `_Quicklink: ${QUICKLINK_HINT}_`,
  ].join("\n");
}
