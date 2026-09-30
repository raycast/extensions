import { Action, ActionPanel, Color, Icon, LaunchProps, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { DrinkCompleteInfo } from "./types";
import { useState } from "react";
import generateDrinkMarkdown from "./utils/generate-drink-markdown";
import useCocktailDB from "./hooks/use-cocktail-db";
import getPreviewImage from "./utils/get-preview-image";
import OpenInBrowserAction from "./utils/open-in-browser-action";

export default function SearchCocktailByName(props: LaunchProps<{ arguments: Arguments.SearchCocktailByName }>) {
  const { name } = props.arguments;
  const [searchName, setSearchName] = useState(name);
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-name-details", false);
  const { isLoading, data: drinks } = useCocktailDB<DrinkCompleteInfo>(`search.php?s=${searchName}`);

  return (
    <List
      isLoading={isLoading}
      throttle
      onSearchTextChange={setSearchName}
      searchText={searchName}
      isShowingDetail={isShowingDetail}
    >
      {!drinks.length && !isLoading ? (
        <List.EmptyView title="No matching drinks found" description="Try searching: Gin or Vodka" />
      ) : (
        <List.Section title={`${drinks.length} drinks`}>
          {drinks.map((drink) => {
            const tags = drink.strTags?.split(",") || [];
            // >4 tags hides the last 2 accessories so we show max 4
            const accessoryTags = tags
              .map((tag, index) => {
                if (index === 4) return { tag: `+${tags.length - 5}` };
                if (index > 4) return undefined;
                return { tag };
              })
              .filter((tag) => !!tag);

            return (
              <List.Item
                key={drink.idDrink}
                icon={{ source: getPreviewImage(drink.strDrinkThumb), fallback: Icon.Dot }}
                title={drink.strDrink}
                subtitle={drink.strDrinkAlternate || ""}
                accessories={
                  isShowingDetail
                    ? undefined
                    : [
                        ...accessoryTags,
                        {
                          tag: {
                            value: drink.strAlcoholic,
                            color: drink.strAlcoholic === "Alcoholic" ? Color.Red : Color.Green,
                          },
                        },
                        { date: new Date(drink.dateModified) },
                      ]
                }
                detail={
                  <List.Item.Detail
                    markdown={generateDrinkMarkdown(drink)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="ID" text={drink.idDrink} />
                        <List.Item.Detail.Metadata.Label title="Name" text={drink.strDrink} />
                        {drink.strVideo ? (
                          <List.Item.Detail.Metadata.Link title="Video" text={drink.strVideo} target={drink.strVideo} />
                        ) : (
                          <List.Item.Detail.Metadata.Label title="Video" text="N/A" />
                        )}
                        <List.Item.Detail.Metadata.TagList title="Category">
                          <List.Item.Detail.Metadata.TagList.Item text={drink.strCategory} />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="Glass" text={drink.strGlass} />
                        {drink.strTags ? (
                          <List.Item.Detail.Metadata.TagList title="Tags">
                            {drink.strTags.split(",").map((tag) => (
                              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        ) : (
                          <List.Item.Detail.Metadata.Label title="Tags" text="N/A" />
                        )}
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
                    <OpenInBrowserAction drink={drink} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
