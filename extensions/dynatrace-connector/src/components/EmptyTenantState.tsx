// src/components/EmptyTenantState.tsx
// Shown when no tenants are configured — prompts the user to add one.

import { List, ActionPanel, Action, Icon, open } from "@raycast/api";

export default function EmptyTenantState() {
  return (
    <List.EmptyView
      icon={Icon.Globe}
      title="No tenant configured"
      description="Add a Dynatrace tenant to start querying logs, problems and more."
      actions={
        <ActionPanel>
          <Action
            title="Open Manage Tenants"
            icon={Icon.Gear}
            onAction={() => open("raycast://extensions/one-developer-corporation/dynatrace-connector/dt-tenants")}
          />
        </ActionPanel>
      }
    />
  );
}
