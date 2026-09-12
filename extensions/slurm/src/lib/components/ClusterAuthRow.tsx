import { Action, ActionPanel, Color, Icon, LaunchType, List, launchCommand } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openMasterInTerminal } from "../ssh";
import type { SshErrorInfo, SshErrorKind } from "../errors";

type IconSpec = { source: Icon; tintColor: Color };

const ICON_BY_KIND: Record<SshErrorKind, IconSpec> = {
  auth: { source: Icon.LockUnlocked, tintColor: Color.Yellow },
  "host-key": { source: Icon.Warning, tintColor: Color.Red },
  "host-not-in-config": { source: Icon.QuestionMarkCircle, tintColor: Color.Orange },
  "unknown-host": { source: Icon.XMarkCircle, tintColor: Color.Red },
  refused: { source: Icon.XMarkCircle, tintColor: Color.Red },
  timeout: { source: Icon.Clock, tintColor: Color.Orange },
  network: { source: Icon.WifiDisabled, tintColor: Color.Red },
  "remote-cmd": { source: Icon.ExclamationMark, tintColor: Color.Red },
  unknown: { source: Icon.ExclamationMark, tintColor: Color.Red },
};

function accessoryFor(kind: SshErrorKind): List.Item.Accessory {
  if (kind === "auth") return { tag: { value: "Reauth ⌘⇧R", color: Color.Yellow } };
  return { tag: { value: "Retry ⌘R", color: Color.SecondaryText } };
}

export function ClusterAuthRow({ host, info, onReauth }: { host: string; info: SshErrorInfo; onReauth: () => void }) {
  async function reauth() {
    try {
      await openMasterInTerminal(host);
    } catch (err) {
      await showFailureToast(err instanceof Error ? err.message : String(err), {
        title: `Couldn't open Terminal for ${host}`,
      });
      return;
    }
    onReauth();
  }

  const icon = ICON_BY_KIND[info.kind] ?? ICON_BY_KIND.unknown;
  const subtitle = info.hint ?? info.message;

  return (
    <List.Item
      title={info.title}
      subtitle={subtitle}
      icon={icon}
      accessories={[accessoryFor(info.kind)]}
      actions={
        <ActionPanel>
          {info.kind === "auth" ? (
            <Action
              title={`Reauthenticate ${host}`}
              icon={Icon.Key}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={reauth}
            />
          ) : (
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onReauth}
            />
          )}
          <Action
            title="Open Select Clusters"
            icon={Icon.List}
            onAction={() => launchCommand({ name: "select-cluster", type: LaunchType.UserInitiated })}
          />
          {info.kind !== "auth" ? (
            <Action
              title={`Open Terminal for ${host}`}
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              onAction={reauth}
            />
          ) : null}
          <Action.CopyToClipboard title="Copy Error Details" content={info.raw} />
        </ActionPanel>
      }
    />
  );
}
