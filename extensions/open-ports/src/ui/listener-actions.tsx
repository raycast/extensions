import { Action, ActionPanel, Icon } from "@raycast/api";
import { LSOF_COMMAND } from "../core/lsof";
import { browserUrl } from "../core/ports";
import { Listener, ProcessDetails } from "../core/types";
import { killTarget, killTargetAsAdmin, killTargetForListener } from "./kill-flow";
import { getSettings } from "./preferences";
import { SHORTCUTS } from "./shortcuts";

interface Props {
  listener: Listener;
  details?: ProcessDetails;
  /** Refreshes the list after anything that may have changed the process table. */
  onChanged: () => void;
  onReloadAsAdmin: () => void;
  isShowingDetail?: boolean;
  onToggleDetail?: () => void;
  /** Puts the kill actions first, for the Kill Listening Process command. */
  killFirst?: boolean;
}

export function ListenerActions(props: Props) {
  const { listener, details, onChanged, onReloadAsAdmin, killFirst } = props;
  const settings = getSettings();

  const target = killTargetForListener(listener, details);
  const killOptions = { confirm: settings.confirmKill, onChanged };

  const terminate = (
    <ActionPanel.Section key="terminate" title="Terminate">
      <Action
        title={`Kill Process (${settings.defaultSignal})`}
        icon={Icon.XMarkCircle}
        style={Action.Style.Destructive}
        shortcut={SHORTCUTS.kill}
        onAction={() => killTarget(target, settings.defaultSignal, killOptions)}
      />
      <Action
        title="Force Kill Process (SIGKILL)"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={SHORTCUTS.forceKill}
        onAction={() => killTarget(target, "SIGKILL", killOptions)}
      />
      <Action
        title="Force Kill as Administrator"
        icon={Icon.Key}
        style={Action.Style.Destructive}
        shortcut={SHORTCUTS.killAsAdmin}
        onAction={() => killTargetAsAdmin(target, "SIGKILL", killOptions)}
      />
    </ActionPanel.Section>
  );

  const inspect = (
    <ActionPanel.Section key="inspect" title="Port">
      <Action.CopyToClipboard title="Copy Port Number" content={String(listener.port)} icon={Icon.Hashtag} />
      <Action.OpenInBrowser
        title="Open in Browser"
        url={browserUrl(listener)}
        icon={Icon.Globe}
        shortcut={SHORTCUTS.openInBrowser}
      />
      {props.onToggleDetail ? (
        <Action
          title={props.isShowingDetail ? "Hide Details" : "Show Details"}
          icon={Icon.Sidebar}
          shortcut={SHORTCUTS.toggleDetail}
          onAction={props.onToggleDetail}
        />
      ) : null}
    </ActionPanel.Section>
  );

  return (
    <ActionPanel>
      {killFirst ? [terminate, inspect] : [inspect, terminate]}

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy PID"
          content={String(listener.pid)}
          icon={Icon.Fingerprint}
          shortcut={SHORTCUTS.copyPid}
        />
        <Action.CopyToClipboard
          title="Copy Process Name"
          content={listener.command}
          icon={Icon.Text}
          shortcut={SHORTCUTS.copyProcessName}
        />
        <Action.CopyToClipboard
          title="Copy Bind Address"
          content={listener.bindings.map((binding) => binding.address).join(", ")}
          icon={Icon.Link}
          shortcut={SHORTCUTS.copyAddress}
        />
        <Action.CopyToClipboard
          title="Copy Kill Command"
          content={`kill -9 ${listener.pid}`}
          icon={Icon.Terminal}
          shortcut={SHORTCUTS.copyKillCommand}
        />
        <Action.CopyToClipboard
          title="Copy Lsof Row"
          content={listener.bindings.map((binding) => binding.raw).join("\n")}
          icon={Icon.Document}
          shortcut={SHORTCUTS.copyLsofRow}
        />
        {details?.commandLine ? (
          <Action.CopyToClipboard title="Copy Command Line" content={details.commandLine} icon={Icon.Code} />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section title="Extension">
        {details?.executable.startsWith("/") ? (
          <Action.ShowInFinder
            title="Show Executable in Finder"
            path={details.executable}
            shortcut={SHORTCUTS.showInFinder}
          />
        ) : null}
        <Action title="Reload" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.reload} onAction={onChanged} />
        <Action
          title="Reload as Administrator"
          icon={Icon.Key}
          shortcut={SHORTCUTS.reloadAsAdmin}
          onAction={onReloadAsAdmin}
        />
        <Action.CopyToClipboard title="Copy Lsof Command" content={LSOF_COMMAND} icon={Icon.Terminal} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
