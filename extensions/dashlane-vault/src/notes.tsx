import { List } from "@raycast/api";

import { ListItemNote } from "@/components/ListItemNote";
import { FavoritesProvider, useSeparateFavoriteItems } from "@/context/favorites";
import { NotesProvider, useNotesContext } from "@/context/notes";
import EmptyView from "./components/EmptyView";
import SyncAction from "./components/actions/note/SyncAction";

const PasswordCommand = () => (
  <NotesProvider>
    <FavoritesProvider cacheKey="favorites-notes">
      <NotesComponent />
    </FavoritesProvider>
  </NotesProvider>
);

function NotesComponent() {
  const { notes, isLoading } = useNotesContext();
  const { favoriteItems, nonFavoriteItems } = useSeparateFavoriteItems(notes ?? []);
  const isEmpty = !isLoading && notes && notes.length === 0;
  const isError = !isLoading && notes === undefined;

  return (
    <List isLoading={isLoading} navigationTitle="Search Notes" searchBarPlaceholder="Search your notes" isShowingDetail>
      {favoriteItems.length > 0 ? (
        <>
          <List.Section title="Favorites">
            {favoriteItems.map((item) => (
              <ListItemNote key={item.id} note={item} />
            ))}
          </List.Section>
          <List.Section title="Other Items">
            {nonFavoriteItems.map((item) => (
              <ListItemNote key={item.id} note={item} />
            ))}
          </List.Section>
        </>
      ) : (
        nonFavoriteItems.map((item) => <ListItemNote key={item.id} note={item} />)
      )}
      <EmptyView isLoading={isLoading} isEmpty={isEmpty} isError={isError} syncAction={<SyncAction />} />
    </List>
  );
}

export default PasswordCommand;
