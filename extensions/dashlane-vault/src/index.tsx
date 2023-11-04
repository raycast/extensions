import { ActionPanel, List } from "@raycast/api";

import { ListItemPassword } from "@/components/ListItemPassword";
import SyncAction from "@/components/actions/password/SyncAction";
import { CurrentApplicationProvider } from "@/context/current-application";
import { FavoritesProvider, useSeparateFavoriteItems } from "@/context/favorites";
import { PasswordsProvider, usePasswordContext } from "@/context/passwords";

const PasswordCommand = () => (
  <PasswordsProvider>
    <FavoritesProvider cacheKey="favorites-passwords">
      <CurrentApplicationProvider>
        <PasswordsComponent />
      </CurrentApplicationProvider>
    </FavoritesProvider>
  </PasswordsProvider>
);

function PasswordsComponent() {
  const { passwords, isLoading } = usePasswordContext();
  const { favoriteItems, nonFavoriteItems } = useSeparateFavoriteItems(passwords ?? []);
  const isEmpty = !isLoading && passwords && passwords.length === 0;

  return (
    <List isLoading={isLoading} navigationTitle="Search Passwords" searchBarPlaceholder="Search your passwords">
      {favoriteItems.length > 0 ? (
        <>
          <List.Section title="Favorites">
            {favoriteItems.map((item) => (
              <ListItemPassword key={item.id} item={item} />
            ))}
          </List.Section>
          <List.Section title="Other Items">
            {nonFavoriteItems.map((item) => (
              <ListItemPassword key={item.id} item={item} />
            ))}
          </List.Section>
        </>
      ) : (
        nonFavoriteItems.map((item) => <ListItemPassword key={item.id} item={item} />)
      )}
      {isLoading ? (
        <List.EmptyView title="Loading..." description="Please wait." />
      ) : (
        <List.EmptyView
          icon={{ source: "dashlane-64.png" }}
          title={isEmpty ? "Vault empty." : "No matching items found."}
          description={
            isEmpty
              ? "Hit the sync button to sync your vault or try logging in again."
              : "Hit the sync button to sync your vault."
          }
          actions={
            !isLoading && (
              <ActionPanel>
                <SyncAction />
              </ActionPanel>
            )
          }
        />
      )}
    </List>
  );
}

export default PasswordCommand;
