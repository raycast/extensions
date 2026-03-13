import { Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Character, getCharacters } from "rickmortyapi";
import "cross-fetch/polyfill";
import { useState } from "react";

export default function Characters() {
  const [searchName, setSearchName] = useState("");

  const {
    isLoading,
    data: characters,
    pagination,
  } = useCachedPromise(
    (name: string) => async (options) => {
      const response = await getCharacters({ page: options.page, name });
      if (response.status !== 200) throw new Error(response.statusMessage);
      const data = response.data.results as Character[];
      const hasMore = Boolean(response.data.info?.next);
      return { data, hasMore };
    },
    [searchName],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail
      throttle
      searchBarPlaceholder="Search character name"
      onSearchTextChange={setSearchName}
    >
      {characters.map((character, characterIndex) => {
        let source;
        switch (character.gender) {
          case "Male":
            source = Icon.Male;
            break;
          case "Female":
            source = Icon.Female;
            break;
          case "Genderless":
            source = Icon.Xmark;
            break;
          default:
            source = Icon.QuestionMark;
            break;
        }
        return (
          <List.Item
            key={characterIndex}
            icon={{
              source,
              tintColor:
                character.status === "Alive" ? Color.Green : character.status === "Dead" ? Color.Red : Color.Yellow,
            }}
            title={character.name}
            subtitle={character.type}
            detail={
              <List.Item.Detail
                markdown={`![${character.name}](${character.image}?raycast-height=185)`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={character.id.toString()} />
                    <List.Item.Detail.Metadata.Label title="Name" text={character.name} />
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item text={character.status} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Species">
                      <List.Item.Detail.Metadata.TagList.Item text={character.species} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text={character.type}
                      icon={!character.type ? Icon.Minus : undefined}
                    />
                    <List.Item.Detail.Metadata.TagList title="Gender">
                      <List.Item.Detail.Metadata.TagList.Item text={character.gender} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Origin" text={character.origin.name} />
                    <List.Item.Detail.Metadata.Label title="Location" text={character.location.name} />
                    <List.Item.Detail.Metadata.Link title="Image" text={character.image} target={character.image} />
                    <List.Item.Detail.Metadata.TagList title="Episodes">
                      {character.episode.map((ep) => {
                        const number = ep.substring(ep.lastIndexOf("/") + 1);
                        return <List.Item.Detail.Metadata.TagList.Item key={number} text={number} />;
                      })}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
