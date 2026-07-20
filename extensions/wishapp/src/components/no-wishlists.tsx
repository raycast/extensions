import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { API_BASE } from "../lib/constants";
import { REFRESH } from "../lib/shortcuts";

export function NoWishlistsView({ onRefresh }: { onRefresh: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Gift}
        title="No wishlists yet"
        description="Create your first wishlist at getwish.app, then come back here."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Website" url={API_BASE} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={REFRESH} onAction={onRefresh} />
          </ActionPanel>
        }
      />
    </List>
  );
}
