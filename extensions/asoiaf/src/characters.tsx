import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import useASOIAF from "./lib/useASOIAF";
import { Character } from "./lib/types";
import ListItemAsTextOrIcon from "./lib/components/ListItemAsTextOrIcon";
import ListItemAsTagsOrIcon from "./lib/components/ListItemAsTagsOrIcon";

export default function Characters() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { isLoading, data: characters, pagination } = useASOIAF<Character>("characters");

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      pagination={pagination}
      searchBarPlaceholder="Search character"
    >
      <List.Section title={`${characters?.length} characters`}>
        {characters?.map((character) => {
          // We do this so when showing details the item is meaningful
          let title = character.name || "<NO NAME>";
          let subtitle = character.aliases.join(", ") || "<NO ALIAS>";
          if (isShowingDetail) {
            if (title === "<NO NAME>") title = "";
            else subtitle = "";
          }

          const genderIcon = character.gender === "Male" ? Icon.Male : Icon.Female;

          return (
            <List.Item
              key={character.url}
              title={title}
              subtitle={subtitle}
              accessories={[{ icon: genderIcon }]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <ListItemAsTextOrIcon title="Name" text={character.name} />
                      <List.Item.Detail.Metadata.Label title="Gender" icon={genderIcon} />
                      <ListItemAsTextOrIcon title="Culture" text={character.culture} />
                      <ListItemAsTextOrIcon title="Born" text={character.born} />
                      <ListItemAsTextOrIcon title="Died" text={character.died} />
                      <ListItemAsTagsOrIcon title="Titles" items={character.titles} />
                      <ListItemAsTagsOrIcon title="Aliases" items={character.aliases} />
                      <List.Item.Detail.Metadata.Label
                        title="Allegiances"
                        text={character.allegiances.length.toString()}
                      />
                      <List.Item.Detail.Metadata.Label title="Books" text={character.books.length.toString()} />
                      <List.Item.Detail.Metadata.Label title="POV Books" text={character.povBooks.length.toString()} />
                      <ListItemAsTagsOrIcon title="TV Series" items={character.tvSeries} />
                      <ListItemAsTagsOrIcon title="Played By" items={character.playedBy} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Details"
                    icon={Icon.AppWindowSidebarLeft}
                    onAction={() => setIsShowingDetail((prev) => !prev)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
