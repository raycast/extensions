import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import type { ReactElement } from "react";
import { CONNECT_COMMAND, USAGE_PAGE } from "./lib/constants";
import { openCommand, useUsage } from "./lib/use-usage";
import { deriveView, type Banner, type Level, type Row, type View } from "./lib/view";

const LEVEL_COLORS: Record<Level, Color> = {
  normal: Color.SecondaryText,
  warning: Color.Orange,
  critical: Color.Red,
};

const BANNER_ICONS: Record<Banner["kind"], List.Item.Props["icon"]> = {
  setup: { source: Icon.Plug, tintColor: Color.Orange },
  limit: { source: Icon.XMarkCircle, tintColor: Color.Red },
};

export default function Command() {
  const { state, error, prefs, isLoading, revalidate } = useUsage({ sync: true });
  const view = deriveView(state, prefs, Date.now());
  const actions = <UsageActions view={view} connected={state.connected} onRefresh={revalidate} />;

  if (error && !state.usage) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't Read Claude Usage"
          description={error.message}
          actions={actions}
        />
      </List>
    );
  }

  if (!state.usage) {
    return (
      <List isLoading={isLoading}>
        {!isLoading && (
          <List.EmptyView
            icon={Icon.Plug}
            title={state.connected ? "Waiting for Claude Code" : "Connect Claude Code"}
            description={view.banners[0]?.text}
            actions={actions}
          />
        )}
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter limits">
      {view.banners.length > 0 && (
        <List.Section title="Status">
          {view.banners.map((banner) => (
            <List.Item key={banner.text} icon={BANNER_ICONS[banner.kind]} title={banner.text} actions={actions} />
          ))}
        </List.Section>
      )}

      <List.Section title="Limits">
        {view.rows.map((row) => (
          <UsageItem key={row.key} row={row} actions={actions} />
        ))}
      </List.Section>

      <List.Section title="Source">
        <List.Item icon={Icon.Clock} title={view.updatedLabel} actions={actions} />
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

function UsageActions({ view, connected, onRefresh }: { view: View; connected: boolean; onRefresh: () => void }) {
  const connect = <Action title="Connect Claude Code" icon={Icon.Plug} onAction={() => openCommand(CONNECT_COMMAND)} />;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!connected && connect}
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
        <Action title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
