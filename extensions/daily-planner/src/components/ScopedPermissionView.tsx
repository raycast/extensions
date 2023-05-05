import { Action, ActionPanel, Icon, List, open } from "@raycast/api";

// A permission view used instead of `useSQL()`'s `permissionView`, which launches "Full Disk Access".
export default function ScopedPermissionView({ scope }: { scope: "Calendars" | "Reminders" }): JSX.Element {
  return (
    <List>
      <List.EmptyView
        icon={Icon.RaycastLogoPos}
        title={`Raycast needs access to ${scope}.`}
        description="You can revert this access in Settings whenever you want."
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Finder}
              title="Open System Settings → Privacy"
              onAction={() =>
                void open(`x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_${scope}`)
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
