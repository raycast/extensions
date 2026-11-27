import {
  openExtensionPreferences,
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getSettings, runCli } from "./utils";
import type { OpenClawSettings } from "./settings";
import { parseSessions } from "./data";

function formatAge(ms: number | null): string {
  if (ms === null) return "unknown age";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatSessionLabel(key: string): string {
  if (key === "agent:main:main") return "Direct (main)";
  if (key.includes("feishu:direct")) return "Feishu · Direct";
  if (key.includes("feishu:group")) return "Feishu · Group";
  return key.replace("agent:main:", "");
}

function tokenColor(pct: number | null): Color {
  if (pct === null) return Color.SecondaryText;
  if (pct < 50) return Color.Green;
  if (pct < 80) return Color.Orange;
  return Color.Red;
}

export default function SessionsCommand() {
  const settingsKey = JSON.stringify(getSettings());
  const {
    data: sessions = [],
    isLoading,
    revalidate,
    error,
  } = usePromise(
    async (serialized: string) =>
      parseSessions(
        await runCli(
          ["sessions", "--json", "--no-color"],
          JSON.parse(serialized) as OpenClawSettings,
        ),
      ),
    [settingsKey],
  );

  async function handleCleanup() {
    await showToast({
      style: Toast.Style.Animated,
      title: "Cleaning up sessions…",
    });
    try {
      await runCli(["sessions", "cleanup", "--no-color"]);
      await showToast({
        style: Toast.Style.Success,
        title: "Sessions cleaned up",
      });
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cleanup failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const actions = () => (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action
        title="Cleanup Sessions"
        icon={Icon.Trash}
        onAction={handleCleanup}
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      />
      <Action
        title="Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="OpenClaw Sessions"
      actions={actions()}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load sessions"
          description={error.message}
        />
      ) : (
        sessions.map((session) => {
          const pct =
            session.contextTokens !== null &&
            session.contextTokens > 0 &&
            session.totalTokens !== null
              ? Math.round((session.totalTokens / session.contextTokens) * 100)
              : null;
          const tokens = session.totalTokens?.toLocaleString() ?? "?";
          const capacity =
            session.contextTokens === null
              ? "?"
              : `${(session.contextTokens / 1000).toFixed(0)}k`;
          return (
            <List.Item
              key={session.key}
              title={formatSessionLabel(session.key)}
              subtitle={formatAge(session.ageMs)}
              accessories={[
                {
                  tag: {
                    value: `${tokens} / ${capacity}${pct === null ? "" : ` (${pct}%)`}`,
                    color: tokenColor(pct),
                  },
                },
                {
                  text: session.model.replace("openrouter/", ""),
                  icon: Icon.ComputerChip,
                },
              ]}
              actions={actions()}
            />
          );
        })
      )}
    </List>
  );
}
