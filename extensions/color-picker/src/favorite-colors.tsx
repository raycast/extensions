import { Action, ActionPanel, Icon, launchCommand, LaunchType, List, showToast } from "@raycast/api";
import { useHistory } from "./lib/history";
import { getAccessories, getFormattedColor, getIcon, getPreviewColor } from "./lib/utils";

function OpenOrganizeColorsAction() {
  return (
    <Action
      title="Open Organize Colors"
      onAction={() => launchCommand({ name: "organize-colors", type: LaunchType.UserInitiated })}
    />
  );
}

export default function Command() {
  const { history, removeFromFavorites } = useHistory();
  const favorites = history?.filter((item) => item.isFavorite) ?? [];

  return (
    <List isLoading={history === undefined} searchBarPlaceholder="Search favorite colors">
      {history !== undefined && favorites.length === 0 ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No favorite colors"
          description="Add colors to your favorites from Organize Colors."
          actions={
            <ActionPanel>
              <OpenOrganizeColorsAction />
            </ActionPanel>
          }
        />
      ) : (
        favorites.map((item) => {
          const formattedColor = getFormattedColor(item.color);
          const previewColor = getPreviewColor(item.color);

          return (
            <List.Item
              key={`${item.date}-${formattedColor}`}
              icon={getIcon(previewColor)}
              title={formattedColor}
              subtitle={item.title}
              accessories={getAccessories(item)}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={formattedColor} />
                  <Action
                    icon={Icon.StarDisabled}
                    title="Remove from Favorites"
                    onAction={async () => {
                      removeFromFavorites(item.color);
                      await showToast({ title: "Removed from favorites" });
                    }}
                  />
                  <OpenOrganizeColorsAction />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
