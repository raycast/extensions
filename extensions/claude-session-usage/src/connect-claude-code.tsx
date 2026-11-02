import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { BRIDGE_DATA_FILE, displayPath } from "./lib/claude-code-source";
import {
  BRIDGE_SCRIPT,
  getBridgeStatus,
  installBridge,
  SETTINGS_FILE,
  uninstallBridge,
  type BridgeStatus,
} from "./lib/bridge";
import { CHECK_COMMAND } from "./lib/constants";
import { formatAgo } from "./lib/format";
import { openCommand, syncMenuBar } from "./lib/use-usage";

function markdown(status: BridgeStatus | undefined): string {
  const intro = [
    "# Connect Claude Code",
    "",
    "Claude Code already knows your 5-hour and weekly usage and hands it to its **status line** after every reply.",
    `Connecting installs a tiny status line script that saves just those numbers to \`${displayPath(BRIDGE_DATA_FILE)}\`.`,
    "",
    "- The ring then updates **while you use Claude Code**. The extension never reads your login and never calls Anthropic.",
    "- Between sessions you see the last numbers. A window shows 0% once its reset time has passed.",
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
        `1. Back up \`${displayPath(SETTINGS_FILE)}\` to \`settings.json.usage-ring.bak\``,
        `2. Create \`${displayPath(BRIDGE_SCRIPT)}\``,
        `3. Set \`statusLine.command\` in \`${displayPath(SETTINGS_FILE)}\` to that script. An existing status line is kept and keeps working.`,
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
      await syncMenuBar();
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
      await syncMenuBar();
    } catch (e) {
      await showFailureToast(e, { title: "Couldn't disconnect" });
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
            <Detail.Metadata.Label title="Script" text={displayPath(BRIDGE_SCRIPT)} />
            <Detail.Metadata.Label title="Data File" text={displayPath(BRIDGE_DATA_FILE)} />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {status?.installed ? (
            <>
              <Action title="Show Usage" icon={Icon.Gauge} onAction={() => openCommand(CHECK_COMMAND)} />
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
