import { Action, ActionPanel, Color, Icon, LaunchProps, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { DrinkCompleteInfo } from "./types";
import { useState } from "react";
import generateDrinkMarkdown from "./utils/generate-drink-markdown";
import useCocktailDB from "./hooks/use-cocktail-db";

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
      {!drinks.length ? (
        <List.EmptyView title="No matching drinks found" description="Try searching: Gin or Vodka" />
      ) : (
        <List.Section title={`${drinks.length} drinks`}>
          {drinks.map((drink) => (
            <List.Item
              key={drink.idDrink}
              icon={{ source: drink.strDrinkThumb, fallback: Icon.Dot }}
              title={drink.strDrink}
              subtitle={drink.strDrinkAlternate || ""}
              accessories={
                isShowingDetail
                  ? undefined
                  : [
                      ...(drink.strTags?.split(",").map((tag) => ({ tag })) || []),
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
                      <List.Item.Detail.Metadata.Separator />
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
          ))}
        </List.Section>
      )}
    </List>
  );
}
