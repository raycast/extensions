import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { google, searchPeople, Person } from "./google";
import { useFavorites } from "./favorites";
import Schedule from "./schedule";

type PersonItemProps = {
  person: Person;
  accessory?: List.Item.Accessory;
  isFavorite: (email: string) => boolean;
  onAddFavorite: (person: Person) => void;
  onRemoveFavorite: (email: string) => void;
  onUse: (person: Person) => void;
};

function PersonItem({
  person,
  accessory,
  isFavorite,
  onAddFavorite,
  onRemoveFavorite,
  onUse,
}: PersonItemProps) {
  const fav = isFavorite(person.email);
  return (
    <List.Item
      icon={person.photo ? { source: person.photo } : Icon.Person}
      title={person.name}
      subtitle={person.email}
      accessories={accessory ? [accessory] : undefined}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Schedule"
            icon={Icon.Calendar}
            target={<Schedule person={person} />}
            onPush={() => onUse(person)}
          />
          {fav ? (
            <Action
              title="Remove Favorite"
              icon={Icon.StarDisabled}
              onAction={() => onRemoveFavorite(person.email)}
            />
          ) : (
            <Action
              title="Add Favorite"
              icon={Icon.Star}
              onAction={() => onAddFavorite(person)}
            />
          )}
          <Action.CopyToClipboard title="Copy Email" content={person.email} />
        </ActionPanel>
      }
    />
  );
}

function Command() {
  const [searchText, setSearchText] = useState("");
  const {
    favorites,
    lastUsed,
    isLoadingFavorites,
    handleAddFavorite,
    handleRemoveFavorite,
    handleSetLastUsed,
    isFavorite,
  } = useFavorites();

  const searching = searchText.length > 1;
  const { data: results, isLoading: isSearching } = useCachedPromise(
    searchPeople,
    [searchText],
    {
      execute: searching,
      keepPreviousData: true,
    },
  );

  const itemProps = {
    isFavorite,
    onAddFavorite: handleAddFavorite,
    onRemoveFavorite: handleRemoveFavorite,
    onUse: handleSetLastUsed,
  };

  return (
    <List
      isLoading={isSearching || isLoadingFavorites}
      throttle
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Meet with…"
    >
      {searching ? (
        <List.Section title="People">
          {(results ?? []).map((p) => (
            <PersonItem key={p.email} person={p} {...itemProps} />
          ))}
        </List.Section>
      ) : (
        <>
          {lastUsed && (
            <List.Section title="Suggestions">
              <PersonItem
                person={lastUsed}
                accessory={{ icon: Icon.Clock, text: "Last used" }}
                {...itemProps}
              />
            </List.Section>
          )}
          {favorites.length > 0 && (
            <List.Section title="Favorites">
              {favorites.map((p) => (
                <PersonItem
                  key={p.email}
                  person={p}
                  accessory={{ icon: Icon.Star }}
                  {...itemProps}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
      {searching && (results ?? []).length === 0 && (
        <List.EmptyView
          title="No matches"
          description="No coworkers found for that name."
        />
      )}
    </List>
  );
}

export default withAccessToken(google)(Command);
