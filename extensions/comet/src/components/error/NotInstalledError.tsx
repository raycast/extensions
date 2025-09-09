import { Action, ActionPanel, List, open } from "@raycast/api";

export function NotInstalledError() {
  return (
    <List>
      <List.EmptyView
        icon="🚫"
        title="Comet browser not installed"
        description="This extension requires Comet browser to work. Please install it to continue."
        actions={
          <ActionPanel>
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
