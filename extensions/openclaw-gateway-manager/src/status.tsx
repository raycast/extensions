import {
  openExtensionPreferences,
  ActionPanel,
  Action,
  Detail,
  Icon,
  showToast,
  Toast,
  Color,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getSettings, runCli } from "./utils";
import type { OpenClawSettings } from "./settings";
import { parseHealth, formatHealth } from "./data";

export default function StatusCommand() {
  const settingsKey = JSON.stringify(getSettings());
  const { data, isLoading, revalidate, error } = usePromise(
    async (serialized: string) => {
      const health = parseHealth(
        await runCli(
          ["health", "--json", "--no-color"],
          JSON.parse(serialized) as OpenClawSettings,
        ),
      );
      return {
        health,
        markdown: formatHealth(health),
        checkedAt: new Date().toLocaleTimeString(undefined, { hour12: false }),
      };
    },
    [settingsKey],
  );

  async function handleRestart() {
    await showToast({
      style: Toast.Style.Animated,
      title: "Restarting gateway…",
    });
    try {
      await runCli(["gateway", "restart", "--no-color"]);
      await showToast({
        style: Toast.Style.Success,
        title: "Gateway restarted",
      });
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Restart failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        error
          ? `# Unable to read status\n\n${error.message}\n\nCheck the gateway and executable path, then press ⌘R to retry.`
          : (data?.markdown ?? "Checking gateway…")
      }
      navigationTitle="OpenClaw Status"
      metadata={
        data && !error ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Gateway">
              <Detail.Metadata.TagList.Item
                text={data.health.ok ? "Healthy" : "Unhealthy"}
                color={data.health.ok ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="Check duration"
              text={
                data.health.durationMs === null
                  ? "Not reported"
                  : `${data.health.durationMs} ms`
              }
            />
            <Detail.Metadata.Label
              title="Sessions"
              text={
                data.health.sessionCount === null
                  ? "Not reported"
                  : String(data.health.sessionCount)
              }
            />
            <Detail.Metadata.Label title="Checked at" text={data.checkedAt} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Channels">
              {data.health.channels.map((channel) => (
                <Detail.Metadata.TagList.Item
                  key={channel.id}
                  text={`${channel.name} · ${channel.summary}`}
                  color={
                    channel.state === "ok"
                      ? Color.Green
                      : channel.state === "warning"
                        ? Color.Orange
                        : Color.SecondaryText
                  }
                />
              ))}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="Needs attention"
              text={String(data.health.issues.length)}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action
            title="Restart Gateway"
            icon={Icon.Repeat}
            onAction={handleRestart}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action
            title="Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
