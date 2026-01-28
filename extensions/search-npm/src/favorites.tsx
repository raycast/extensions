import { Action, ActionPanel, List } from "@raycast/api";
import { useFavorites } from "@/hooks/useFavorites";
import { PackageListItem } from "@/components/PackagListItem";
import PackageList from ".";

export default function Favorites() {
  const [favorites, fetchFavorites] = useFavorites();

  return (
    <List searchBarPlaceholder="Filter your favorite packages…">
      {favorites?.length ? (
        <List.Section title="Favorites" subtitle={favorites.length.toString()}>
          {favorites.map((result) => {
            return (
              <PackageListItem
                key={result.name}
                result={result}
                isFavorited={favorites.findIndex((item) => item.name === result.name) !== -1}
                handleFaveChange={fetchFavorites}
                isViewingFavorites
              />
            );
          })}
        </List.Section>
      ) : (
        <List.EmptyView
          title="No favorites yet. Search for a package to add it to your favorites."
          actions={
            <ActionPanel>
              {}
              <Action.Push title="Search npm" target={<PackageList />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
