import { Action, ActionPanel, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { missingScope, T212Error } from "../lib/t212/client";

export function t212ErrorInfo(error: Error): { title: string; description?: string } {
  if (error instanceof T212Error) {
    switch (error.kind) {
      case "unauthorized":
        return {
          title: "Invalid API key or secret",
          description: "Check the API key and secret in the extension preferences.",
        };
      case "forbidden": {
        const scope = missingScope(error);
        return {
          title: "API key is missing a permission",
          description: scope
            ? `Missing permission: ${scope}. Enable it for this key in Trading 212 → Settings → API`
            : "Enable Account data, Portfolio and History for this key in Trading 212 → Settings → API",
        };
      }
      case "rateLimited":
        return { title: "Trading 212 is rate-limiting requests, try again in a few seconds" };
      case "network":
        return { title: "Can't reach Trading 212", description: error.message };
    }
  }
  return { title: "Something went wrong", description: error.message };
}

export function T212ErrorEmptyView({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { title, description } = t212ErrorInfo(error);
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          {onRetry && (
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRetry}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
