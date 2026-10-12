import { Action, ActionPanel, Icon, Image, List, getPreferenceValues, useNavigation, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import {
  Appearance,
  Character,
  CharacterFilters,
  CharacterPage,
  buildCharacterUrl,
  characterWikiUrl,
  parseCharacterResponse,
} from "./api";
import { useFavourites } from "./use-favourites";

type BrowseMode = "characters" | "films" | "tvShows" | "favourites";

export default function Command() {
  return <CharacterList />;
}

function CharacterList({ appearance }: { appearance?: Appearance }) {
  const { showImages } = getPreferenceValues<Preferences>();
  const [mode, setMode] = useState<BrowseMode>("characters");
  const [searchText, setSearchText] = useState("");
  const { favourites, toggle, isLoading: favouritesLoading } = useFavourites();
  const showingFavourites = !appearance && mode === "favourites";
  const needsQuery = !appearance && (mode === "films" || mode === "tvShows") && !searchText.trim();
  const filters: CharacterFilters = appearance
    ? { [appearance.kind]: appearance.title, name: searchText }
    : mode === "films" || mode === "tvShows"
      ? { [mode]: searchText }
      : { name: searchText };

  const { data, error, isLoading, pagination, revalidate } = useFetch<CharacterPage, undefined, Character[]>(
    ({ page }) => buildCharacterUrl(filters, page + 1),
    {
      parseResponse: parseCharacterResponse,
      mapResult: (result) => result,
      keepPreviousData: true,
      execute: !showingFavourites && !needsQuery,
      failureToastOptions: { title: "Could Not Load Disney Characters" },
    },
  );
  // The API occasionally repeats characters across pages. IDs also keep selection stable.
  const characters = showingFavourites
    ? favourites
    : needsQuery
      ? []
      : [...new Map((data ?? []).map((character) => [character._id, character])).values()];
  const favouriteIds = new Set(favourites.map((character) => character._id));
  const loading =
    favouritesLoading || (!showingFavourites && !needsQuery && (isLoading || (data === undefined && !error)));
  const failed = !showingFavourites && !needsQuery && !!error;
  const placeholder = appearance
    ? "Search characters in " + appearance.title + "…"
    : mode === "films"
      ? "Search a film, e.g. Frozen…"
      : mode === "tvShows"
        ? "Search a TV show, e.g. DuckTales…"
        : showingFavourites
          ? "Search favourite characters…"
          : "Search Disney characters…";

  return (
    <List
      navigationTitle={appearance ? appearance.title + " Characters" : undefined}
      isLoading={loading}
      isShowingDetail={characters.length > 0}
      searchBarPlaceholder={placeholder}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={showingFavourites}
      throttle={!showingFavourites}
      pagination={!showingFavourites && !needsQuery ? pagination : undefined}
      searchBarAccessory={
        !appearance ? (
          <List.Dropdown
            tooltip="Browse Characters"
            value={mode}
            onChange={(value) => {
              setMode(value as BrowseMode);
              setSearchText("");
            }}
          >
            <List.Dropdown.Item title="All Characters" value="characters" icon={Icon.Person} />
            <List.Dropdown.Item title="By Film" value="films" icon={Icon.FilmStrip} />
            <List.Dropdown.Item title="By TV Show" value="tvShows" icon={Icon.Monitor} />
            <List.Dropdown.Item title="Favourites" value="favourites" icon={Icon.Star} />
          </List.Dropdown>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {!showingFavourites && !needsQuery ? (
            <Action
              title="Reload Characters"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          ) : undefined}
          {!appearance && !showingFavourites ? (
            <Action
              title="Show Favourites"
              icon={Icon.Star}
              onAction={() => {
                setMode("favourites");
                setSearchText("");
              }}
            />
          ) : undefined}
        </ActionPanel>
      }
    >
      {loading ? (
        // Raycast can show empty views while loading a nonempty search. Only show its native loading indicator.
        <List.EmptyView icon={null} title="" />
      ) : (
        <List.EmptyView
          icon={showingFavourites ? Icon.Star : failed ? Icon.ExclamationMark : Icon.Person}
          title={
            showingFavourites
              ? favourites.length
                ? "No Matching Favourites"
                : "No Favourites Yet"
              : needsQuery
                ? mode === "films"
                  ? "Search by Film"
                  : "Search by TV Show"
                : failed
                  ? "Could Not Load Characters"
                  : "No Characters Found"
          }
          description={
            showingFavourites
              ? favourites.length
                ? "Try another character, film, or show name."
                : "Add characters to your favourites with ⌘D."
              : needsQuery
                ? "Enter a title to find characters appearing in it."
                : failed
                  ? "Try reloading, or browse your saved favourites."
                  : "Try another search."
          }
        />
      )}
      {characters.map((character) => (
        <List.Item
          id={String(character._id)}
          key={character._id}
          title={character.name}
          icon={
            showImages && character.imageUrl
              ? { source: character.imageUrl, fallback: Icon.Person, mask: Image.Mask.RoundedRectangle }
              : Icon.Person
          }
          keywords={[...character.films, ...character.tvShows, ...character.shortFilms]}
          accessories={favouriteIds.has(character._id) ? [{ icon: Icon.Star, tooltip: "Favourite" }] : []}
          detail={<CharacterDetail character={character} showImages={showImages} />}
          actions={
            <CharacterActions
              character={character}
              isFavourite={favouriteIds.has(character._id)}
              toggleFavourite={() => toggle(character)}
              reload={!showingFavourites ? revalidate : undefined}
              showFavourites={
                !appearance && !showingFavourites
                  ? () => {
                      setMode("favourites");
                      setSearchText("");
                    }
                  : undefined
              }
            />
          }
        />
      ))}
    </List>
  );
}

function CharacterDetail({ character, showImages }: { character: Character; showImages: boolean }) {
  const { push } = useNavigation();
  const groups: { title: string; values: string[]; kind?: Appearance["kind"] }[] = [
    { title: "Films", values: character.films, kind: "films" },
    { title: "Short Films", values: character.shortFilms },
    { title: "TV Shows", values: character.tvShows, kind: "tvShows" },
    { title: "Video Games", values: character.videoGames },
    { title: "Park Attractions", values: character.parkAttractions },
    { title: "Allies", values: character.allies },
    { title: "Enemies", values: character.enemies },
  ];
  const wikiUrl = characterWikiUrl(character);

  return (
    <List.Item.Detail
      markdown={showImages && character.imageUrl ? "![Character image](<" + character.imageUrl + ">)" : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          {groups
            .filter((group) => group.values.length > 0)
            .map(({ title, values, kind }) => (
              <List.Item.Detail.Metadata.TagList key={title} title={title}>
                {values.map((value) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={value}
                    text={value}
                    onAction={kind ? () => push(<CharacterList appearance={{ kind, title: value }} />) : undefined}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            ))}
          <List.Item.Detail.Metadata.Link
            title="Disney Wiki"
            text={character.sourceUrl ? character.name : "Search for " + character.name}
            target={wikiUrl}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function CharacterActions({
  character,
  isFavourite,
  toggleFavourite,
  reload,
  showFavourites,
}: {
  character: Character;
  isFavourite: boolean;
  toggleFavourite: () => Promise<void>;
  reload?: () => void;
  showFavourites?: () => void;
}) {
  const wikiUrl = characterWikiUrl(character);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title={character.sourceUrl ? "Open Character Wiki" : "Search Character Wiki"}
          url={wikiUrl}
        />
        <Action
          title={isFavourite ? "Remove from Favourites" : "Add to Favourites"}
          icon={isFavourite ? Icon.StarDisabled : Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={toggleFavourite}
        />
        {showFavourites ? <Action title="Show Favourites" icon={Icon.Star} onAction={showFavourites} /> : undefined}
      </ActionPanel.Section>
      <ActionPanel.Section title="Browse Appearances">
        {character.films.length > 0 ? (
          <ActionPanel.Submenu title="Browse Films" icon={Icon.FilmStrip}>
            {character.films.map((title) => (
              <Action.Push key={title} title={title} target={<CharacterList appearance={{ kind: "films", title }} />} />
            ))}
          </ActionPanel.Submenu>
        ) : undefined}
        {character.tvShows.length > 0 ? (
          <ActionPanel.Submenu title="Browse TV Shows" icon={Icon.Monitor}>
            {character.tvShows.map((title) => (
              <Action.Push
                key={title}
                title={title}
                target={<CharacterList appearance={{ kind: "tvShows", title }} />}
              />
            ))}
          </ActionPanel.Submenu>
        ) : undefined}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Character Name"
          content={character.name}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard title="Copy Wiki Link" content={wikiUrl} shortcut={Keyboard.Shortcut.Common.Copy} />
        {reload ? (
          <Action
            title="Reload Characters"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={reload}
          />
        ) : undefined}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
