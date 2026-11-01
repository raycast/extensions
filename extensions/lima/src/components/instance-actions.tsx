import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { ReactNode } from "react";
import { Instance, isRunning, Pending, shellCommand, sshCommand } from "../lib/instance";
import { CacheList } from "./cache-list";
import { ExtensionActions } from "./extension-actions";
import { LogsView } from "./logs-view";
import { VolumeList } from "./volume-list";

interface Props {
  instance: Instance;
  pending?: Pending;
  createAction: ReactNode;
  onOpenShell: () => void;
  onStart: (thenOpenShell?: boolean) => void;
  onStop: () => void;
  onRestart: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

/**
 * ↵ and ⌘↵ do what an instance is for in its state: a running one opens a shell, a stopped one starts.
 * Everything else keeps its shortcut whatever the state, so the keys stay the same from row to row.
 * While a start, stop or restart runs, ↵ only refreshes, so a quick ↵ can't do something unexpected.
 */
export function InstanceActions({
  instance,
  pending,
  createAction,
  onOpenShell,
  onStart,
  onStop,
  onRestart,
  onDelete,
  onRefresh,
}: Props) {
  const running = isRunning(instance);
  const ssh = sshCommand(instance);
  const config = `${instance.dir}/lima.yaml`;
  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );

  return (
    <ActionPanel title={instance.name}>
      <ActionPanel.Section>
        {pending ? (
          refreshAction
        ) : running ? (
          <>
            <Action title="Open Shell" icon={Icon.Terminal} onAction={onOpenShell} />
            <Action.CopyToClipboard title="Copy Shell Command" content={shellCommand(instance)} />
          </>
        ) : (
          <>
            <Action title="Start" icon={Icon.Play} onAction={() => onStart()} />
            <Action title="Start and Open Shell" icon={Icon.Terminal} onAction={() => onStart(true)} />
          </>
        )}
        {ssh && (
          <Action.CopyToClipboard title="Copy SSH Command" content={ssh} shortcut={Keyboard.Shortcut.Common.Copy} />
        )}
        {instance.message && (
          <Action.Push
            title="Show Template Notes"
            icon={Icon.Info}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<Detail navigationTitle={instance.name} markdown={notes(instance.message)} />}
          />
        )}
        <Action.Push
          title="Show Logs"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          target={<LogsView name={instance.name} />}
        />
      </ActionPanel.Section>
      {!pending && (
        <ActionPanel.Section>
          {running && (
            <Action
              title="Stop"
              icon={Icon.Stop}
              shortcut={{ modifiers: ["opt", "cmd"], key: "s" }}
              onAction={onStop}
            />
          )}
          {running && (
            <Action
              title="Restart"
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={onRestart}
            />
          )}
          {!instance.protected && (
            <Action
              title="Delete Instance"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={onDelete}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action.Open
          title="Edit Configuration"
          icon={Icon.Pencil}
          target={config}
          shortcut={Keyboard.Shortcut.Common.Edit}
        />
        <Action.ShowInFinder path={instance.dir} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
        <Action.CopyToClipboard
          title="Copy Folder Path"
          content={instance.dir}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {createAction}
        <Action.Push title="Image Cache" icon={Icon.HardDrive} target={<CacheList />} />
        <Action.Push title="Volumes" icon={Icon.HardDrive} target={<VolumeList />} />
        {!pending && refreshAction}
      </ActionPanel.Section>
      <ExtensionActions />
    </ActionPanel>
  );
}

/** Templates write their notes for a terminal, so they're shown as is. */
function notes(message: string): string {
  return ["```", message.trim(), "```"].join("\n");
}
