import { useMemo } from "react";

import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { getShellEnv, refreshShellEnv } from "../lib/exec";
import {
  defaultValues,
  effectiveValues,
  parseTemplate,
  substitute,
} from "../lib/parser";
import { deleteCommand } from "../lib/store";
import { removeUsage } from "../lib/usage";
import type { ParamDef } from "../lib/parser";
import type { SavedCommand } from "../lib/types";
import type { CommandUsage, LastAction } from "../lib/usage";
import CommandForm from "./CommandForm";
import OverrideForm from "./OverrideForm";
import { performRun } from "./runCommand";

interface CommandListItemProps {
  command: SavedCommand;
  usage?: CommandUsage;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onReload: () => void;
  onUsed: (action: LastAction, values: Record<string, string>) => void;
}

const ACTION_ORDERS: Record<LastAction, [LastAction, LastAction, LastAction]> =
  {
    run: ["run", "copy", "paste"],
    copy: ["copy", "run", "paste"],
    paste: ["paste", "run", "copy"],
  };

function escapeCell(text: string): string {
  return text.replaceAll("|", "\\|");
}

function describeDefault(param: ParamDef): string {
  if (param.options) {
    return param.options.map(escapeCell).join(" \\| ");
  }
  return param.defaultValue === undefined
    ? "required"
    : escapeCell(param.defaultValue);
}

function detailMarkdown(
  command: SavedCommand,
  params: ParamDef[],
  resolved: string,
  hasMissing: boolean,
  lastValues?: Record<string, string>,
): string {
  const lines = ["````", hasMissing ? command.template : resolved, "````"];
  if (params.length > 0) {
    if (lastValues) {
      lines.push(
        "",
        "| Parameter | Default | Last used |",
        "| --- | --- | --- |",
      );
      for (const param of params) {
        lines.push(
          `| ${param.name} | ${describeDefault(param)} | ${escapeCell(lastValues[param.name] ?? "")} |`,
        );
      }
    } else {
      lines.push("", "| Parameter | Default |", "| --- | --- |");
      for (const param of params) {
        lines.push(`| ${param.name} | ${describeDefault(param)} |`);
      }
    }
  }
  return lines.join("\n");
}

export default function CommandListItem(props: CommandListItemProps) {
  const { command, usage, isShowingDetail, onToggleDetail, onReload, onUsed } =
    props;

  const { push } = useNavigation();
  const params = useMemo(
    () => parseTemplate(command.template),
    [command.template],
  );
  const effective = useMemo(
    () => effectiveValues(params, usage?.values),
    [params, usage],
  );
  const resolvedResult = useMemo(
    () => substitute(command.template, effective),
    [command.template, effective],
  );

  const hasMissing = resolvedResult.missing.length > 0;

  const openOverrideForm = (
    focusParam?: string,
    seedValues?: Record<string, string>,
  ) => {
    push(
      <OverrideForm
        command={command}
        lastValues={seedValues ?? usage?.values}
        focusParam={focusParam}
        onUsed={onUsed}
      />,
    );
  };

  const handleRun = async (values: Record<string, string>) => {
    const { command: resolved, missing } = substitute(command.template, values);
    if (missing.length > 0) {
      // seed the form with the values this run was asked to use, so "Run with Default Values" cannot leak memory back in
      openOverrideForm(missing[0], values);
      return;
    }
    await performRun({
      command,
      resolved,
      push,
      onWillRun: () => onUsed("run", values),
    });
  };

  const handleCopy = async () => {
    if (hasMissing) {
      openOverrideForm(resolvedResult.missing[0]);
      return;
    }
    await Clipboard.copy(resolvedResult.command);
    onUsed("copy", effective);
    await showHUD("Copied to clipboard");
  };

  const handlePaste = async () => {
    if (hasMissing) {
      openOverrideForm(resolvedResult.missing[0]);
      return;
    }
    onUsed("paste", effective);
    await closeMainWindow();
    await Clipboard.paste(resolvedResult.command);
  };

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete command?",
      message: command.name,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    try {
      deleteCommand(command.id);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: String(error),
      });
      return;
    }
    await removeUsage(command.id);
    await showToast({ style: Toast.Style.Success, title: "Command deleted" });
    onReload();
  };

  const handleRefreshEnv = async () => {
    refreshShellEnv();
    await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing shell environment…",
    });
    await getShellEnv();
    await showToast({
      style: Toast.Style.Success,
      title: "Shell environment refreshed",
    });
  };

  const accessories: List.Item.Accessory[] = [];
  if (!isShowingDetail) {
    if (params.length > 0) {
      accessories.push({
        tag: `${params.length} param${params.length === 1 ? "" : "s"}`,
      });
    }
    if (usage !== undefined) {
      accessories.push({
        icon: Icon.Clock,
        tooltip: "Prefilled with last-used values",
      });
    }
    if (command.runMode === "terminal") {
      accessories.push({ icon: Icon.Terminal, tooltip: "Runs in terminal" });
    }
  }

  const baseActions = {
    run: (
      <Action
        key="run"
        title="Run"
        icon={Icon.Play}
        onAction={() => void handleRun(effective)}
      />
    ),
    copy: (
      <Action
        key="copy"
        title="Copy Command"
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={() => void handleCopy()}
      />
    ),
    paste: (
      <Action
        key="paste"
        title="Paste to Frontmost App"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        onAction={() => void handlePaste()}
      />
    ),
  };
  const [first, second, third] = ACTION_ORDERS[usage?.action ?? "run"];

  return (
    <List.Item
      title={command.name}
      subtitle={
        isShowingDetail
          ? undefined
          : hasMissing
            ? command.template
            : resolvedResult.command
      }
      keywords={[...command.keywords, ...command.template.split(/\s+/)]}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={detailMarkdown(
            command,
            params,
            resolvedResult.command,
            hasMissing,
            usage?.values,
          )}
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {baseActions[first]}
            <Action
              title="Adjust and Run"
              icon={Icon.Pencil}
              onAction={() => openOverrideForm()}
            />
            {baseActions[second]}
            {baseActions[third]}
            {usage !== undefined && params.length > 0 ? (
              <Action
                title="Run with Default Values"
                icon={Icon.Play}
                onAction={() => void handleRun(defaultValues(params))}
              />
            ) : null}
            <Action
              title="Toggle Preview"
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={onToggleDetail}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Edit Command"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() =>
                push(<CommandForm command={command} onSaved={onReload} />)
              }
            />
            <Action
              title="New Command"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => push(<CommandForm onSaved={onReload} />)}
            />
            <Action
              title="Delete Command"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => void handleDelete()}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Reload Library"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onReload}
            />
            <Action
              title="Refresh Shell Environment"
              icon={Icon.Terminal}
              onAction={() => void handleRefreshEnv()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
