import { ActionPanel, Action, Grid, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { WoltClient, WoltAPIError } from "wolt-api";
import { buildItemUrl, groupMenuItemsByCategory, buildMenuItemSubtitle } from "../utils/menu";

export interface MenuViewProps {
  venueId: string;
  venueName: string;
  venueSlug: string;
  currency?: string;
  citySlug?: string;
  countryCode?: string;
  highlightItemId?: string;
}

export function MenuView({
  venueId,
  venueName,
  venueSlug,
  currency,
  citySlug,
  countryCode,
  highlightItemId,
}: MenuViewProps) {
  const client = new WoltClient();

  const {
    data: menuResponse,
    isLoading,
    error,
  } = useCachedPromise(
    async (id: string) => {
      try {
        const menu = await client.getVenueMenu({
          venue_id: id,
        });
        return menu;
      } catch (err) {
        if (err instanceof WoltAPIError) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load menu",
            message: err.message,
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: err instanceof Error ? err.message : "Failed to load menu",
          });
        }
        throw err;
      }
    },
    [venueId],
  );

  const menuByCategory = menuResponse ? groupMenuItemsByCategory(menuResponse) : {};
  const categories = Object.keys(menuByCategory).sort();

  return (
    <Grid isLoading={isLoading} navigationTitle={`Menu - ${venueName}`} columns={4} aspectRatio="16/9">
      {error && (
        <Grid.EmptyView
          icon="⚠️"
          title="Error loading menu"
          description={error instanceof Error ? error.message : "Unknown error occurred"}
        />
      )}
      {!error && !isLoading && menuResponse && menuResponse.items && menuResponse.items.length === 0 && (
        <Grid.EmptyView icon="📋" title="No menu items" description="This venue has no menu items available" />
      )}
      {!error &&
        categories.map((category) => (
          <Grid.Section key={category} title={category} subtitle={`${menuByCategory[category].length} items`}>
            {menuByCategory[category].map((item) => {
              const itemImage = item.images && item.images.length > 0 ? item.images[0].url : undefined;
              const subtitle = buildMenuItemSubtitle(item, currency, highlightItemId === item.id);
              const itemUrl = buildItemUrl(item.id, venueId, venueSlug, citySlug, countryCode);

              return (
                <Grid.Item
                  key={item.id}
                  title={item.name}
                  subtitle={subtitle}
                  content={itemImage || ""}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.OpenInBrowser title="Open in Browser" url={itemUrl} />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </Grid.Section>
        ))}
    </Grid>
  );
}
