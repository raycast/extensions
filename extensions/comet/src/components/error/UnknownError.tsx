import { List, Action, ActionPanel, open } from "@raycast/api";

export function UnknownError() {
  return (
    <List>
      <List.EmptyView
        icon="⚠️"
        title="Something went wrong"
        description="An unexpected error occurred. Try again or check if Comet browser is properly installed and accessible."
        actions={
          <ActionPanel>
            <Action
              title="Open Comet Browser"
              onAction={async () => {
                await open("comet://");
              }}
            />
            <Action
              title="Download Comet Browser"
              onAction={async () => {
                await open("https://comet.perplexity.ai/");
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
