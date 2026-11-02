import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { existsSync } from "node:fs";
import type { ReactElement } from "react";
import { BRIDGE_SCRIPT } from "./lib/bridge";
import { CONNECT_COMMAND, useUsage } from "./lib/use-usage";
import { USAGE_PAGE } from "./lib/usage-api";
import { deriveView, errorBanner, type Banner, type Level, type Row, type View } from "./lib/view";

const LEVEL_COLORS: Record<Level, Color> = {
  normal: Color.SecondaryText,
  warning: Color.Orange,
  critical: Color.Red,
};

const BANNER_ICONS: Record<Banner["kind"], List.Item.Props["icon"]> = {
  error: { source: Icon.Warning, tintColor: Color.Orange },
  paused: { source: Icon.Pause, tintColor: Color.SecondaryText },
  stale: { source: Icon.Clock, tintColor: Color.SecondaryText },
  locked: { source: Icon.XMarkCircle, tintColor: Color.Red },
};

export default function Command() {
  const { snap, prefs, isLoading, revalidate } = useUsage({ syncMenuBar: true });
  const view = deriveView(snap, prefs, Date.now());

  async function refreshNow() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing usage" });
    const next = await revalidate();
    if (next.lastError?.kind === "rate_limited") {
      toast.style = Toast.Style.Success;
      toast.title = "Showing latest usage";
      toast.message = errorBanner(next.lastError.kind, next.backoffUntil, prefs.credentialsSource);
    } else if (next.lastError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't refresh usage";
      toast.message = errorBanner(next.lastError.kind, next.backoffUntil, prefs.credentialsSource);
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Usage updated";
    }
  }

  const actions = <UsageActions view={view} onRefresh={refreshNow} />;

  if (!snap.usage) {
    const error = view.banners.find((b) => b.kind === "error");
    return (
      <List isLoading={isLoading}>
        {!isLoading && (
          <List.EmptyView
            icon={error ? Icon.Warning : Icon.CircleProgress}
            title={error ? "Couldn't Load Claude Usage" : "No Usage Data Yet"}
            description={error?.text ?? "Press ⌘R to fetch your Claude usage."}
            actions={actions}
          />
        )}
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Claude Usage" searchBarPlaceholder="Filter limits">
      {view.banners.length > 0 && (
        <List.Section title="Status">
          {view.banners.map((banner) => (
            <List.Item key={banner.text} icon={BANNER_ICONS[banner.kind]} title={banner.text} actions={actions} />
          ))}
        </List.Section>
      )}

      <List.Section title="Limits">
        {[...view.rows, ...view.extraRows].map((row) => (
          <UsageItem key={row.key} row={row} actions={actions} />
        ))}
      </List.Section>

      <List.Section title="Account">
        {view.planLabel && (
          <List.Item
            icon={Icon.Person}
            title={view.planLabel.replace(/^Plan: /, "")}
            subtitle="Plan"
            actions={actions}
          />
        )}
        <List.Item
          icon={Icon.Clock}
          title={view.updatedLabel}
          accessories={view.dim ? [{ tag: { value: "Stale", color: Color.Orange } }] : []}
          actions={actions}
        />
      </List.Section>
    </List>
  );
}

function UsageItem({ row, actions }: { row: Row; actions: ReactElement }) {
  return (
    <List.Item
      icon={{ source: row.icon }}
      title={row.title}
      subtitle={row.reset ?? undefined}
      keywords={[row.key]}
      accessories={[{ tag: { value: row.percent, color: LEVEL_COLORS[row.level] }, tooltip: `${row.percent} used` }]}
      actions={actions}
    />
  );
}

function UsageActions({ view, onRefresh }: { view: View; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Usage Page" url={USAGE_PAGE} />
        <Action
          title="Refresh Usage"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
        {view.summary && (
          <Action.CopyToClipboard
            title="Copy Usage Summary"
            content={view.summary}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {!existsSync(BRIDGE_SCRIPT) && (
          <Action
            title="Connect Claude Code"
            icon={Icon.Plug}
            onAction={() => launchCommand({ name: CONNECT_COMMAND, type: LaunchType.UserInitiated })}
          />
        )}
        <Action title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
