import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { OpenCushnAction } from "./open-cushn-action";

export function NotConnectedView() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Plug}
        title="Turn on Raycast in Cushn → Settings → Agents"
        description="The extension talks to the Cushn app on this Mac."
        actions={
          <ActionPanel>
            <OpenCushnAction />
          </ActionPanel>
        }
      />
    </List>
  );
}

export function LoadErrorView({ title, error, onRetry }: { title: string; error: Error; onRetry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={title}
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <OpenCushnAction />
        </ActionPanel>
      }
    />
  );
}

export function RefreshAction({ onAction }: { onAction: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onAction}
    />
  );
}
