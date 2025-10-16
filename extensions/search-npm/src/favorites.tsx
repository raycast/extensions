import { Action, ActionPanel, List } from '@raycast/api'
import PackageList from '.'
import { PackageListItem } from './components/PackagListItem'
import { useFavorites } from './hooks/useFavorites'

export default function Favorites() {
  const [favorites, fetchFavorites] = useFavorites()

  return (
    <List searchBarPlaceholder="Filter your favorite packages…">
      {favorites?.length ? (
        <List.Section title="Favorites" subtitle={favorites.length.toString()}>
          {favorites.map((result) => {
            return (
              <PackageListItem
                key={result.name}
                result={result}
                isFavorited={
                  favorites.findIndex((item) => item.name === result.name) !==
                  -1
                }
                handleFaveChange={fetchFavorites}
                isViewingFavorites
              />
            )
          })}
        </List.Section>
      ) : (
        <List.EmptyView
          title="No favorites yet. Search for a package to add it to your favorites."
          actions={
            <ActionPanel>
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.Push title="Search npm" target={<PackageList />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  )
}
