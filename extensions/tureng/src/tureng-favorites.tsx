import { ActionPanel, Action, Icon, List, confirmAlert, Alert } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getFavorites, removeFavorite } from "./favorites";
import { TranslationResult } from "./search-tureng";

export default function Command() {
  const { data: favorites, isLoading, revalidate } = usePromise(getFavorites);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter favorites...">
      {favorites && favorites.length === 0 && (
        <List.EmptyView icon={Icon.Star} title="No favorites yet" description="Add words from translation results" />
      )}
      {favorites?.map((word) => (
        <List.Item
          key={word}
          icon={Icon.Star}
          title={word}
          actions={
            <ActionPanel>
              <Action.Push title="Look up" icon={Icon.Book} target={<TranslationResult word={word} />} />
              <Action.CopyToClipboard title="Copy Word" content={word} />
              <Action
                title="Remove from Favorites"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: `Remove "${word}"?`,
                      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                    })
                  ) {
                    await removeFavorite(word);
                    revalidate();
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
