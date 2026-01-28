import { usePotterDB } from "./lib/use-potter-db";
import { Spell } from "./lib/types";
import { Icon, List } from "@raycast/api";
import { DEFAULT_IMAGE } from "./lib/constants";
import { useState } from "react";
import { generateImageMarkdown } from "./lib/generate-image-markdown";

export default function Spells() {
  const [searchName, setSearchName] = useState("");
  const { data: spells, isLoading, pagination } = usePotterDB<Spell>("spells", "Spells", searchName);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
      searchBarPlaceholder="Search spells by name"
      onSearchTextChange={setSearchName}
      throttle
    >
      <List.Section title={`${spells?.length} spells`}>
        {spells.map((spell) => (
          <List.Item
            key={spell.id}
            title={spell.attributes.name}
            icon={spell.attributes.image || DEFAULT_IMAGE}
            detail={
              <List.Item.Detail
                markdown={`${generateImageMarkdown(spell.attributes.image)} \n\n ${spell.attributes.effect}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={spell.id} />
                    <List.Item.Detail.Metadata.Label title="Slug" text={spell.attributes.slug} />
                    <List.Item.Detail.Metadata.TagList title="Category">
                      <List.Item.Detail.Metadata.TagList.Item text={spell.attributes.category} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="Creator"
                      text={spell.attributes.creator || ""}
                      icon={spell.attributes.creator ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label title="Effect" text={spell.attributes.effect} />
                    <List.Item.Detail.Metadata.Label
                      title="Hand"
                      text={spell.attributes.hand || ""}
                      icon={spell.attributes.hand ?? Icon.Minus}
                    />
                    {spell.attributes.image ? (
                      <List.Item.Detail.Metadata.Link
                        title="Image"
                        text={spell.attributes.image}
                        target={spell.attributes.image}
                      />
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Image" icon={Icon.Minus} />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Incantation"
                      text={spell.attributes.incantation || ""}
                      icon={spell.attributes.incantation ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.TagList title="Light">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={spell.attributes.light}
                        color={spell.attributes.light}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Name" text={spell.attributes.name} />
                    <List.Item.Detail.Metadata.Link
                      title="Wiki"
                      text={spell.attributes.wiki}
                      target={spell.attributes.wiki}
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
