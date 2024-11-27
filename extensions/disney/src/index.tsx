import { List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Preferences {
  showImages: boolean;
}

type Character = {
  _id: number;
  url: string;
  name: string;
  sourceUrl: string;
  films: string[];
  shortFilms: string[];
  tvShows: string[];
  videoGames: string[];
  parkAttractions: string[];
  allies: string[];
  enemies: string[];
  imageUrl: string;
};

type Characters = {
  data: Character[];
  totalPages: number;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState("1");
  const { isLoading, data } = useFetch<Characters>(
    searchText
      ? `https://api.disneyapi.dev/character?name=${searchText}`
      : `https://api.disneyapi.dev/characters?page=${page}`,
    {
      keepPreviousData: true,
    }
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        !searchText ? (
          <List.Dropdown tooltip="Page Number" onChange={(newPage) => setPage(newPage)} storeValue>
            <List.Dropdown.Section title="Pages">
              {Array.from(Array(data?.totalPages).keys()).map((i) => (
                <List.Dropdown.Item key={i} title={`Page ${i + 1}`} value={`${i + 1}`} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {data?.data.map((character: Character, index: number) => (
        <List.Item
          key={index}
          icon={character.imageUrl ? { source: character.imageUrl } : undefined}
          title={character.name}
          detail={
            <List.Item.Detail
              markdown={preferences.showImages ? `![${character.name}](${character.imageUrl})` : undefined}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Films" text={`${character.films.length}`} />
                  {character.films.map((film: string, index: number) => (
                    <List.Item.Detail.Metadata.Label key={index} title="Title" text={film} />
                  ))}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Short Films" text={`${character.shortFilms.length}`} />
                  {character.shortFilms.map((shortFilm: string, index: number) => (
                    <List.Item.Detail.Metadata.Label key={index} title="Name" text={shortFilm} />
                  ))}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="TV Shows" text={`${character.tvShows.length}`} />
                  {character.tvShows.map((tvShow: string, index: number) => (
                    <List.Item.Detail.Metadata.Label key={index} title="Name" text={tvShow} />
                  ))}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Allies" text={`${character.allies.length}`} />
                  {character.allies.map((ally: string, index: number) => (
                    <List.Item.Detail.Metadata.Label key={index} title="Name" text={ally} />
                  ))}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Enemies" text={`${character.enemies.length}`} />
                  {character.enemies.map((enemy: string, index: number) => (
                    <List.Item.Detail.Metadata.Label key={index} title="Name" text={enemy} />
                  ))}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Video Games" text={`${character.videoGames.length}`} />
                  {character.videoGames.map((videoGame: string, index: number) => (
                    <List.Item.Detail.Metadata.Label key={index} title="Title" text={videoGame} />
                  ))}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Park Attractions"
                    text={`${character.parkAttractions.length}`}
                  />
                  {character.parkAttractions.map((parkAttraction: string, index: number) => (
                    <List.Item.Detail.Metadata.Label key={index} title="Name" text={parkAttraction} />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
