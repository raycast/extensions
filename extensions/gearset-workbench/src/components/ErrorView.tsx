import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { GearsetSetupAction } from "./SetupGuide";

export function ErrorView({ title, error, onRetry }: { title: string; error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <Detail
      markdown={`# ${title}\n\n${message}`}
      actions={
        <ActionPanel>
          {onRetry ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null}
          <GearsetSetupAction />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

type EmptyConfigurationKind = "automation-token" | "reporting-token" | "audit-token" | "jobs";

export function EmptyConfiguration({ kind }: { kind: EmptyConfigurationKind }) {
  const copy = {
    "automation-token": "Add a scoped Gearset Automation API token to use this command.",
    "reporting-token": "Add a scoped Gearset Reporting API token to use this command.",
    "audit-token": "Add a scoped Gearset Audit API token to use this command.",
    jobs: "Add at least one CI job using `Name|Job UUID|sandbox` or `Name|Job UUID|production`.",
  }[kind];
  return (
    <Detail
      markdown={`# Gearset Workbench setup required\n\n${copy}`}
      actions={
        <ActionPanel>
          <GearsetSetupAction />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser
            title="Open Gearset Access Token Management"
            url="https://app.gearset.com/configure"
            icon={Icon.Link}
          />
        </ActionPanel>
      }
    />
  );
}
