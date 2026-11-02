import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Icon,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { BRIDGE_DATA_FILE } from "./lib/claude-code-source";
import {
  BRIDGE_COMMAND,
  BRIDGE_SCRIPT,
  getBridgeStatus,
  installBridge,
  SETTINGS_FILE,
  uninstallBridge,
  type BridgeStatus,
} from "./lib/bridge";
import { formatAgo } from "./lib/format";
const CHECK_COMMAND = "check-usage";

function markdown(status: BridgeStatus | undefined): string {
  const intro = [
    "# Connect Claude Code",
    "",
    "Claude Code already knows your 5-hour and weekly usage and hands it to its **status line** after every reply.",
    "Connecting installs a tiny status line script that saves just those numbers to `~/.claude/usage-ring.json`.",
    "",
    "- The ring then updates **while you use Claude Code**, without calling Anthropic and without touching your login.",
    "- When Claude Code hasn't run for a few minutes, the extension falls back to the usage API (unless you chose *Claude Code only* in preferences).",
    "- Only the `rate_limits` numbers are written. Paths, prompts and session details are not.",
    "- Requires a Pro or Max subscription in Claude Code.",
  ];
  if (!status) return intro.join("\n");

  const state = status.installed
    ? [
        "## Connected",
        "",
        status.dataUpdatedAt
          ? `Last update from Claude Code: **${formatAgo(status.dataUpdatedAt, Date.now())}**.`
          : "Waiting for the first update. Send any message in Claude Code.",
        "",
        status.passthroughCommand
          ? `Your previous status line still runs: \`${status.passthroughCommand}\``
          : "You had no status line before, so Claude Code's status line stays empty.",
      ]
    : [
        "## Not connected",
        "",
        "Press **Connect** (↵). This will:",
        "",
        `1. Back up \`~/.claude/settings.json\` to \`settings.json.usage-ring.bak\``,
        `2. Create \`${BRIDGE_COMMAND}\``,
        `3. Set \`statusLine.command\` in \`~/.claude/settings.json\` to that script. An existing status line is kept and keeps working.`,
        "",
        "Disconnecting restores your previous status line exactly.",
      ];
  return [...intro, "", ...state].join("\n");
}

export default function Command() {
  const { data: status, isLoading, revalidate } = usePromise(getBridgeStatus);

  async function connect() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting Claude Code" });
    try {
      await installBridge();
      toast.style = Toast.Style.Success;
      toast.title = "Claude Code connected";
      toast.message = "Send a message in Claude Code to start updates";
      revalidate();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't connect Claude Code";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  async function disconnect() {
    const confirmed = await confirmAlert({
      title: "Disconnect Claude Code?",
      message: "Your previous status line setting will be restored.",
      primaryAction: { title: "Disconnect", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await uninstallBridge();
      await showToast({ style: Toast.Style.Success, title: "Claude Code disconnected" });
      revalidate();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't disconnect",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown(status)}
      metadata={
        status && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={status.installed ? "Connected" : "Not Connected"}
                color={status.installed ? "#2EB67D" : "#8E8E93"}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="Last Update"
              text={status.dataUpdatedAt ? formatAgo(status.dataUpdatedAt, Date.now()) : "Never"}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Script" text={BRIDGE_COMMAND} />
            <Detail.Metadata.Label title="Data File" text="~/.claude/usage-ring.json" />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {status?.installed ? (
            <>
              <Action
                title="Show Usage"
                icon={Icon.Gauge}
                onAction={() => launchCommand({ name: CHECK_COMMAND, type: LaunchType.UserInitiated })}
              />
              <Action title="Disconnect" icon={Icon.Eject} style={Action.Style.Destructive} onAction={disconnect} />
            </>
          ) : (
            <Action title="Connect" icon={Icon.Plug} onAction={connect} />
          )}
          <ActionPanel.Section>
            <Action.Open title="Open Claude Code Settings" target={SETTINGS_FILE} icon={Icon.Document} />
            {status?.installed && <Action.ShowInFinder title="Show Script in Finder" path={BRIDGE_SCRIPT} />}
            {status?.dataUpdatedAt && <Action.ShowInFinder title="Show Data File in Finder" path={BRIDGE_DATA_FILE} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
