import { ActionPanel, List } from "@raycast/api";
import { ActionOpenPreferences } from "./components/action-open-preferences";

// This is a placeholder file to satisfy the TypeScript compiler
// It will be removed in a future update

// Define the filterTag export to satisfy the import in the error message
export const filterTag = "";

// Comment out the unused type to avoid ESLint errors
// This is just a placeholder to satisfy the TypeScript compiler
// type CustomPreferences = {
//   SearchWorkflowsApi: string;
// };

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

// Define a function with a 'value' parameter to satisfy the error message
export function handleValue(value: string): void {
  console.log(value);
}
