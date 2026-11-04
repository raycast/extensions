import { openSessionCommand } from "./lib/launch";
import { Color, Icon, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { rowTime, statusLabel } from "./core/format";
import { isClaudeCloudOnly } from "./core/claude-desktop";
import { groupInbox, waitingCount } from "./core/status";
import { agentIcon } from "./components/icons";
import { extensionConfig } from "./lib/env";
import { activeSessions, jumpBack } from "./lib/sessions";

/**
 * When enabled in Raycast preferences, shows subscribed sessions and their waiting count.
 * Refreshed by Raycast's background refresh (interval in package.json) — hooks write the database,
 * this only reads it.
 */
export default function MenuBar() {
  const config = extensionConfig();
  const { data, isLoading } = useCachedPromise(activeSessions, []);
  const sessions = (data ?? []).filter((s) => s.subscribed);
  const groups = groupInbox(sessions);
  const count = waitingCount(sessions);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: "menu-bar-icon.png", tintColor: count > 0 ? Color.Orange : Color.PrimaryText }}
      title={count > 0 ? String(count) : undefined}
      tooltip="Agent Inbox · Subscribed Sessions"
    >
      {sessions.length === 0 && <MenuBarExtra.Item title="No subscribed sessions" />}
      {(["needs_input", "subscribed", "done"] as const).map(
        (section) =>
          groups[section].length > 0 && (
            <MenuBarExtra.Section
              key={section}
              title={section === "needs_input" ? "Waiting for You" : section === "done" ? "Completed" : "Subscribed"}
            >
              {groups[section].map((s) => (
                <MenuBarExtra.Item
                  key={`${s.agent}:${s.sessionId}`}
                  icon={isClaudeCloudOnly(s) ? Icon.Cloud : agentIcon(s.agent)}
                  title={s.title || s.sessionId}
                  subtitle={isClaudeCloudOnly(s) ? undefined : `${statusLabel(s)} · ${rowTime(s)}`}
                  onAction={() => jumpBack(s, config)}
                />
              ))}
            </MenuBarExtra.Section>
          ),
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Subscriptions"
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          onAction={() => openSessionCommand("inbox")}
        />
        <MenuBarExtra.Item
          title="Browse All Sessions"
          icon={Icon.List}
          onAction={() => openSessionCommand("all-sessions")}
        />
        <MenuBarExtra.Item title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
