import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import type { Project } from "../lib/revenuecat";
export interface Context {
  apiKey: string | (() => Promise<string>);
  project: Project;
  projects?: Project[];
  currency: string;
  demo?: boolean;
}
export const DASHBOARD = "https://app.revenuecat.com";
export function SettingsAction() {
  return <Action title="Configure RevenueCat" icon={Icon.Gear} onAction={openExtensionPreferences} />;
}
export function CommonActions({ refresh, url = DASHBOARD }: { refresh?: () => void; url?: string }) {
  return (
    <ActionPanel.Section>
      {refresh && (
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
      )}
      <Action.OpenInBrowser title="Open in RevenueCat" url={url} shortcut={Keyboard.Shortcut.Common.Open} />
      <SettingsAction />
    </ActionPanel.Section>
  );
}
export function Empty({
  loading,
  error,
  title,
  refresh,
  actions,
}: {
  loading: boolean;
  error?: string;
  title: string;
  refresh: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <List.EmptyView
      icon={error ? Icon.Lock : loading ? Icon.Clock : Icon.MagnifyingGlass}
      title={error ? "This view is unavailable" : loading ? "Loading…" : title}
      description={error}
      actions={
        <ActionPanel>
          {actions}
          <CommonActions refresh={refresh} />
        </ActionPanel>
      }
    />
  );
}
export function More({
  next,
  error,
  loading,
  loadMore,
  refresh,
}: {
  next?: string;
  error?: string;
  loading: boolean;
  loadMore: () => void;
  refresh: () => void;
}) {
  return (
    <List.Section>
      {error && (
        <List.Item
          title="Couldn’t load more"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <CommonActions refresh={refresh} />
            </ActionPanel>
          }
        />
      )}
      {next && (
        <List.Item
          id="load-more"
          title={loading ? "Loading…" : "Load More"}
          icon={Icon.Ellipsis}
          actions={
            <ActionPanel>
              <Action title="Load More" onAction={loadMore} />
            </ActionPanel>
          }
        />
      )}
    </List.Section>
  );
}
export function readable(value?: string | null) {
  return value ? value.replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase()) : "Not provided";
}
export function dateLabel(value?: number | null) {
  return value
    ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "Not provided";
}
export function statusColor(status?: string) {
  return status === "active" || status === "trialing"
    ? Color.Green
    : status === "expired" || status === "inactive"
      ? Color.SecondaryText
      : Color.Orange;
}
export function customerURL(project: string, customer: string) {
  return `${DASHBOARD}/customers/${encodeURIComponent(project)}/${encodeURIComponent(customer)}`;
}
