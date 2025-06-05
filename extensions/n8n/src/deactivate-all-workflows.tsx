import { ActionPanel, List } from "@raycast/api";
import { ActionOpenPreferences } from "./components/action-open-preferences";

// This is a placeholder file to satisfy the TypeScript compiler
// It will be removed in a future update

export default function Command() {
  return (
    <List>
      <List.EmptyView
        title="This command has been deprecated"
        description="Please use the 'Search Workflows' command instead."
        icon={{ source: "empty-icon.png" }}
        actions={
          <ActionPanel>
            <ActionOpenPreferences />
          </ActionPanel>
        }
      />
    </List>
  );
}
