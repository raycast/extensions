import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { SalesforceSetupAction } from "./SetupGuide";

export function ErrorView({ title, error, onRetry }: { title: string; error?: Error; onRetry?: () => void }) {
  return (
    <Detail
      markdown={`# ${title}\n\n${error?.message ?? "An unknown error occurred."}`}
      actions={
        <ActionPanel>
          {onRetry ? <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null}
          <SalesforceSetupAction />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
