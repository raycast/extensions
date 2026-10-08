import { List, ActionPanel, Action, Icon } from "@raycast/api";

export function ArcNotEntitledView() {
  return (
    <List>
      <List.EmptyView
        title="AI Runtime Control Not Enabled"
        description="Your account doesn't have access to AI Runtime Control yet. Contact Fastly to enable it."
        icon={Icon.Lock}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Learn About Fastly AI" url="https://www.fastly.com/products/ai" />
          </ActionPanel>
        }
      />
    </List>
  );
}
