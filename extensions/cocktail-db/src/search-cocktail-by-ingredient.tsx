import { Action, ActionPanel, Detail, Grid, Icon, LaunchProps } from "@raycast/api";
import { DrinkBasicInfo, DrinkCompleteInfo } from "./types";
import { useState } from "react";
import useCocktailDB from "./hooks/use-cocktail-db";
import generateDrinkMarkdown from "./utils/generate-drink-markdown";
import getPreviewImage from "./utils/get-preview-image";
import OpenInBrowserAction from "./utils/open-in-browser-action";

export default function SearchCocktailByName(props: LaunchProps<{ arguments: Arguments.SearchCocktailByIngredient }>) {
  const { ingredient } = props.arguments;
  const [searchIngredient, setSearchIngredient] = useState(ingredient);
  const { isLoading, data: drinks } = useCocktailDB<DrinkBasicInfo>(`filter.php?i=${searchIngredient}`);

  return (
    <Grid isLoading={isLoading} throttle onSearchTextChange={setSearchIngredient} searchText={searchIngredient}>
      {!drinks.length && !isLoading ? (
        <Grid.EmptyView title="No matching drinks found" description="Try searching: Gin or Vodka" />
      ) : (
        <Grid.Section title={`${drinks.length} drinks`}>
          {drinks.map((drink) => (
            <Grid.Item
              key={drink.idDrink}
              content={{ source: getPreviewImage(drink.strDrinkThumb), fallback: Icon.Dot }}
              title={drink.strDrink}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Eye} title="View Drink" target={<ViewDrink id={drink.idDrink} />} />
                  <OpenInBrowserAction drink={drink} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}

function ViewDrink({ id }: { id: string }) {
  const { isLoading, data: drinks } = useCocktailDB<DrinkCompleteInfo>(`lookup.php?i=${id}`);
  const drink = drinks.length && drinks[0];

  return (
    <Detail
      isLoading={isLoading}
      markdown={!drink ? "" : generateDrinkMarkdown(drink)}
      metadata={
        drink && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={drink.idDrink} />
            <Detail.Metadata.Label title="Name" text={drink.strDrink} />
            {drink.strVideo ? (
              <Detail.Metadata.Link title="Video" text={drink.strVideo} target={drink.strVideo} />
            ) : (
              <Detail.Metadata.Label title="Video" text="N/A" />
            )}
            <Detail.Metadata.TagList title="Category">
              <Detail.Metadata.TagList.Item text={drink.strCategory} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Glass" text={drink.strGlass} />
            {drink.strTags ? (
              <Detail.Metadata.TagList title="Tags">
                {drink.strTags.split(",").map((tag) => (
                  <Detail.Metadata.TagList.Item key={tag} text={tag} />
                ))}
              </Detail.Metadata.TagList>
            ) : (
              <Detail.Metadata.Label title="Tags" text="N/A" />
            )}
          </Detail.Metadata>
        )
      }
      actions={
        drink && (
          <ActionPanel>
            <OpenInBrowserAction drink={drink} />
          </ActionPanel>
        )
      }
    />
  );
}
