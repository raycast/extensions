import { Action, ActionPanel, Icon, Keyboard, open, openExtensionPreferences } from "@raycast/api";
import { quitApp } from "../lib/app-actions";
import { canQuitApp } from "../lib/processes";
import type { AppUsage } from "../types";

export function UsageActions({
  app,
  copySummary,
  paused,
  onTogglePause,
  showQuiet,
  onToggleQuiet,
  showCharts,
  onToggleCharts,
  onReorder,
  quietSummary = false,
  onRetry,
}: {
  app?: AppUsage;
  copySummary: string;
  paused: boolean;
  onTogglePause: () => void;
  showQuiet: boolean;
  onToggleQuiet: () => void;
  showCharts: boolean;
  onToggleCharts: () => void;
  onReorder: () => void;
  quietSummary?: boolean;
  onRetry?: () => void;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {onRetry && <Action title="Retry Monitoring" icon={Icon.ArrowClockwise} onAction={onRetry} />}
        {quietSummary && <Action title="Show Quiet Apps" icon={Icon.Eye} onAction={onToggleQuiet} />}
        <Action.CopyToClipboard title="Copy Summary" content={copySummary} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action
          title="Sort by Latest Usage"
          icon={Icon.ArrowDown}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onReorder}
        />
        <Action
          title={paused ? "Resume Monitoring" : "Pause Monitoring"}
          icon={paused ? Icon.Play : Icon.Pause}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={onTogglePause}
        />
        <Action
          title={showQuiet ? "Hide Quiet Apps" : "Show Quiet Apps"}
          icon={showQuiet ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
          onAction={onToggleQuiet}
        />
        <Action
          title={showCharts ? "Hide Charts" : "Show Charts"}
          icon={Icon.AppWindowSidebarRight}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={onToggleCharts}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title={app?.name}>
        {app && canQuitApp(app) && (
          <>
            <Action
              title="Quit App"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
              onAction={() => quitApp(app)}
            />
            <Action
              title="Force Quit App…"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "q" }}
              onAction={() => quitApp(app, true)}
            />
          </>
        )}
        <Action
          title="Open in Activity Monitor"
          icon={Icon.Gauge}
          onAction={() => open("/System/Applications/Utilities/Activity Monitor.app")}
        />
        {app?.identity.kind === "app" && <Action.ShowInFinder path={app.identity.path} title="Reveal App in Finder" />}
        {app && (
          <Action.CopyToClipboard title="Copy Process IDs" content={app.processes.map((info) => info.pid).join(", ")} />
        )}
      </ActionPanel.Section>
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}
