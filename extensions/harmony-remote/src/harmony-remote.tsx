import { Action, ActionPanel, Icon, List, showHUD, showToast, Toast, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { getShortcuts, getHubIp, withHub, Shortcut } from "./lib/harmony";

const SHORTCUT_ICONS: Record<string, Icon> = {
  activity: Icon.Play,
  off: Icon.Power,
  "device-command": Icon.SpeakerOn,
};

export default function HarmonyRemote() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    (async () => {
      const ip = await getHubIp();
      if (!ip) {
        setNeedsSetup(true);
        setIsLoading(false);
        return;
      }
      const saved = await getShortcuts();
      if (saved.length === 0) {
        setNeedsSetup(true);
        setIsLoading(false);
        return;
      }
      setShortcuts(saved);
      setIsLoading(false);
    })();
  }, []);

  if (needsSetup) {
    return (
      <List>
        <List.EmptyView
          title="No Shortcuts Configured"
          description="Run 'Setup Harmony Hub' to discover your hub and pick shortcuts"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action
                title="Open Setup"
                icon={Icon.Gear}
                onAction={() => open("raycast://extensions/chad_walters/harmony-remote/setup-hub")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search shortcuts...">
      {shortcuts.map((shortcut, index) => (
        <List.Item
          key={shortcut.id}
          title={shortcut.label}
          icon={{ source: shortcut.icon || SHORTCUT_ICONS[shortcut.type] || Icon.Circle }}
          subtitle={shortcut.type === "device-command" && shortcut.repeats ? `x${shortcut.repeats}` : undefined}
          accessories={[{ text: `${index + 1}`, tooltip: `Shortcut #${index + 1}` }]}
          actions={
            <ActionPanel>
              <Action
                title="Execute"
                icon={Icon.Play}
                onAction={async () => {
                  try {
                    const result = await withHub((hub) => hub.executeShortcut(shortcut));
                    await showHUD(result);
                  } catch (error) {
                    await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(error) });
                  }
                }}
              />
              <Action
                title="Reconfigure Shortcuts"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={() => open("raycast://extensions/chad_walters/harmony-remote/setup-hub")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
