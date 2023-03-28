import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Character = {
  _id: number;
  url: string;
  name: string;
  sourceUrl: string;
  films: string[];
  shortFilms: string[];
  tvShows: string[];
  videoGames: string[];
  alignment: string;
  parkAttractions: string[];
  allies: string[];
  enemies: string[];
  imageUrl: string;
};

type Characters = {
  data: Character[];
};

export default function Command() {
  const { isLoading, data } = useFetch<Characters>("https://api.disneyapi.dev/characters");
  // https://api.disneyapi.dev/character?name=moana

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data?.data.map((character: Character, index: number) => (
        <List.Item
          key={index}
          title={character.name}
          detail={
            <List.Item.Detail
              markdown={`![${character.name}](${character.imageUrl})`}
              metadata={
                <List.Item.Detail.Metadata>
                  {character.films.length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Label title="Films" />
                      {character.films.map((film: string, index: number) => (
                        <List.Item.Detail.Metadata.Label key={index} title="Title" text={film} />
                      ))}
                      <List.Item.Detail.Metadata.Separator />
                    </>
                  )}
                  <List.Item.Detail.Metadata.Label title="Chracteristics" />
                  <List.Item.Detail.Metadata.Label title="Height" text="70cm" />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
