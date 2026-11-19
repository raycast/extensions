import { Action, ActionPanel, Icon, List, openExtensionPreferences, Keyboard } from "@raycast/api";

export function CommonActions({ refresh }: { refresh: () => void }) {
  return (
    <ActionPanel.Section>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
      <Action title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="CodePen API Settings" url="https://codepen.io/settings/api" />
    </ActionPanel.Section>
  );
}

export function EmptyView({
  error,
  title,
  description,
  children,
}: {
  error?: Error;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <List.EmptyView
      icon={error ? Icon.ExclamationMark : Icon.Code}
      title={error ? "Could Not Load CodePen" : title}
      description={error?.message ?? description}
      actions={<ActionPanel>{children}</ActionPanel>}
    />
  );
}

export function LoadMoreItem({ hasMore, onLoadMore }: { hasMore: boolean; onLoadMore: () => void }) {
  if (!hasMore) return null;
  return (
    <List.Item
      id="load-more"
      title="Load More"
      subtitle="Search includes the items loaded so far"
      icon={Icon.Ellipsis}
      actions={
        <ActionPanel>
          <Action title="Load More" onAction={onLoadMore} />
        </ActionPanel>
      }
    />
  );
}

export function codeMarkdown(content: string, filename: string): string {
  const longest = Math.max(2, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length));
  const fence = "`".repeat(longest + 1);
  const extension =
    filename
      .split(".")
      .pop()
      ?.replace(/[^a-zA-Z0-9]/g, "") ?? "";
  return `${fence}${extension}\n${content}\n${fence}`;
}
