import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { BridgeClientError, fetchAuthedHealth, getBridgePreferences } from "./lib/bridge";
import type { BridgeAuthedHealth } from "./lib/types";

export default function StatusCommand() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<BridgeAuthedHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const { bridgeUrl, bridgeToken } = getBridgePreferences();
      const result = await fetchAuthedHealth(bridgeUrl, bridgeToken);
      setHealth(result);
    } catch (caught) {
      const message =
        caught instanceof BridgeClientError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Unknown bridge error";
      setHealth(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh(): Promise<void> {
    await showToast({ style: Toast.Style.Animated, title: "Checking Mach Triage…" });
    await refresh();
  }

  if (loading && !health && !error) {
    return <Detail isLoading markdown="# Mach Triage\n\nChecking bridge…" />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Mach Triage\n\n**Not connected**\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void onRefresh()} />
          </ActionPanel>
        }
      />
    );
  }

  const proLabel = health?.isPro ? "Pro" : "Free";
  const workspace = health?.activeWorkspaceId ?? "None";

  return (
    <Detail
      markdown={`# Mach Triage\n\n**Connected** to local bridge.\n\n| | |\n|---|---|\n| App version | ${health?.version ?? "—"} |\n| License | ${proLabel} |\n| Bridge port | ${health?.port ?? "—"} |\n| Active workspace | \`${workspace}\` |`}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void onRefresh()} />
        </ActionPanel>
      }
    />
  );
}
