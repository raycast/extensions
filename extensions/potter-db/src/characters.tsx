import { usePotterDB } from "./lib/use-potter-db";
import { Character } from "./lib/types";
import { Icon, List } from "@raycast/api";
import { DEFAULT_IMAGE } from "./lib/constants";
import { useState } from "react";
import { generateImageMarkdown } from "./lib/generate-image-markdown";

export default function Characters() {
  const [searchName, setSearchName] = useState("");
  const { data: characters, isLoading, pagination } = usePotterDB<Character>("characters", "Characters", searchName);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
      searchBarPlaceholder="Search characters by name"
      onSearchTextChange={setSearchName}
      throttle
    >
      <List.Section title={`${characters.length} characters`}>
        {characters.map((character) => (
          <List.Item
            key={character.id}
            keywords={character.attributes.alias_names}
            title={character.attributes.name}
            icon={character.attributes.image || DEFAULT_IMAGE}
            detail={
              <List.Item.Detail
                markdown={generateImageMarkdown(character.attributes.image, 185)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={character.id} />
                    <List.Item.Detail.Metadata.Label title="Slug" text={character.attributes.slug} />
                    <List.Item.Detail.Metadata.Label
                      title="Alias"
                      text={character.attributes.alias_names.join(",")}
                      icon={!character.attributes.alias_names.length ? Icon.Minus : undefined}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Animagus"
                      text={character.attributes.animagus || ""}
                      icon={character.attributes.animagus ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Blood Status"
                      text={character.attributes.blood_status || ""}
                      icon={character.attributes.blood_status ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Boggart"
                      text={character.attributes.boggart || ""}
                      icon={character.attributes.boggart ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Born"
                      text={character.attributes.born || ""}
                      icon={character.attributes.born ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Died"
                      text={character.attributes.died || ""}
                      icon={character.attributes.died ?? Icon.Minus}
                    />
                    {character.attributes.eye_color ? (
                      <List.Item.Detail.Metadata.TagList title="Eye Color">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={character.attributes.eye_color}
                          color={character.attributes.eye_color}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Eye Color" icon={Icon.Minus} />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Family Members"
                      text={character.attributes.family_members.join(",")}
                      icon={!character.attributes.family_members.length ? Icon.Minus : undefined}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Gender"
                      text={character.attributes.gender || ""}
                      icon={character.attributes.gender ?? Icon.Minus}
                    />
                    {character.attributes.hair_color ? (
                      <List.Item.Detail.Metadata.TagList title="Hair Color">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={character.attributes.hair_color}
                          color={character.attributes.hair_color}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Hair Color" icon={Icon.Minus} />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Height"
                      text={character.attributes.height || ""}
                      icon={character.attributes.height ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="House"
                      text={character.attributes.house || ""}
                      icon={character.attributes.house ?? Icon.Minus}
                    />
                    {character.attributes.image ? (
                      <List.Item.Detail.Metadata.Link
                        title="Image"
                        text={character.attributes.image}
                        target={character.attributes.image}
                      />
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Image" icon={Icon.Minus} />
                    )}
                    {character.attributes.jobs.length ? (
                      <List.Item.Detail.Metadata.TagList title="Jobs">
                        {character.attributes.jobs.map((job) => (
                          <List.Item.Detail.Metadata.TagList.Item key={job} text={job} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Jobs" icon={Icon.Minus} />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Marital Status"
                      text={character.attributes.marital_status || ""}
                      icon={character.attributes.marital_status ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label title="Name" text={character.attributes.name} />
                    <List.Item.Detail.Metadata.Label
                      title="Nationality"
                      text={character.attributes.nationality || ""}
                      icon={character.attributes.nationality ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Patronus"
                      text={character.attributes.patronus || ""}
                      icon={character.attributes.patronus ?? Icon.Minus}
                    />
                    {character.attributes.romances.length ? (
                      <List.Item.Detail.Metadata.TagList title="Romances">
                        {character.attributes.romances.map((romance) => (
                          <List.Item.Detail.Metadata.TagList.Item key={romance} text={romance} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Romances" icon={Icon.Minus} />
                    )}
                    {character.attributes.skin_color ? (
                      <List.Item.Detail.Metadata.TagList title="Skin Color">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={character.attributes.skin_color}
                          color={character.attributes.skin_color}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Skin Color" icon={Icon.Minus} />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Species"
                      text={character.attributes.species || ""}
                      icon={character.attributes.species ?? Icon.Minus}
                    />
                    {character.attributes.titles.length ? (
                      <List.Item.Detail.Metadata.TagList title="Titles">
                        {character.attributes.titles.map((title) => (
                          <List.Item.Detail.Metadata.TagList.Item key={title} text={title} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Titles" icon={Icon.Minus} />
                    )}
                    {character.attributes.wands.length ? (
                      <List.Item.Detail.Metadata.TagList title="Wands">
                        {character.attributes.wands.map((wand) => (
                          <List.Item.Detail.Metadata.TagList.Item key={wand} text={wand} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Wands" icon={Icon.Minus} />
                    )}
                    {/* weight */}
                    <List.Item.Detail.Metadata.Link
                      title="Wiki"
                      text={character.attributes.wiki}
                      target={character.attributes.wiki}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
