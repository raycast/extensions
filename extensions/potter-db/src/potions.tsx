import { usePotterDB } from "./lib/use-potter-db";
import { Potion } from "./lib/types";
import { Icon, List } from "@raycast/api";
import { DEFAULT_IMAGE } from "./lib/constants";
import { useState } from "react";
import { generateImageMarkdown } from "./lib/generate-image-markdown";

export default function Potions() {
  const [searchName, setSearchName] = useState("");
  const { data: potions, isLoading, pagination } = usePotterDB<Potion>("potions", "Potions", searchName);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
      searchBarPlaceholder="Search potions by name"
      onSearchTextChange={setSearchName}
      throttle
    >
      <List.Section title={`${potions.length} potions`}>
        {potions.map((potion) => (
          <List.Item
            key={potion.id}
            title={potion.attributes.name}
            icon={potion.attributes.image || DEFAULT_IMAGE}
            detail={
              <List.Item.Detail
                markdown={`${generateImageMarkdown(potion.attributes.image)} \n\n ${potion.attributes.effect || ""}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={potion.id} />
                    <List.Item.Detail.Metadata.Label title="Slug" text={potion.attributes.slug} />
                    <List.Item.Detail.Metadata.Label
                      title="Characteristics"
                      text={potion.attributes.characteristics || ""}
                      icon={potion.attributes.characteristics ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Difficulty"
                      text={potion.attributes.difficulty || ""}
                      icon={potion.attributes.difficulty ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Effect"
                      text={potion.attributes.effect || ""}
                      icon={potion.attributes.effect ?? Icon.Minus}
                    />
                    {potion.attributes.image ? (
                      <List.Item.Detail.Metadata.Link
                        title="Image"
                        text={potion.attributes.image}
                        target={potion.attributes.image}
                      />
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Image" icon={Icon.Minus} />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Inventors"
                      text={potion.attributes.inventors || ""}
                      icon={potion.attributes.inventors ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Ingredients"
                      text={potion.attributes.ingredients || ""}
                      icon={potion.attributes.ingredients ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Manufacturers"
                      text={potion.attributes.manufacturers || ""}
                      icon={potion.attributes.manufacturers ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label title="Name" text={potion.attributes.name} />
                    <List.Item.Detail.Metadata.Label
                      title="Side Effects"
                      text={potion.attributes.side_effects || ""}
                      icon={potion.attributes.side_effects ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Time"
                      text={potion.attributes.time || ""}
                      icon={potion.attributes.time ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Link
                      title="Wiki"
                      text={potion.attributes.wiki}
                      target={potion.attributes.wiki}
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
