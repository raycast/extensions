import { Action, ActionPanel, Color, Icon, LaunchProps, List } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { Drink, Response } from "./types";
import { useState } from "react";
import LinkOrText from "./components/link-or-text";
import generateDrinkMarkdown from "./utils/generate-drink-markdown";

export default function SearchCocktailByName(props: LaunchProps<{arguments: Arguments.SearchCocktailByName}>) {
    const { name } = props.arguments;
    const [searchName, setSearchName] = useState(name);
    const [isShowingDetail, setIsShowingDetail] = useCachedState("show-name-details", false);
    const { isLoading, data } = useFetch<Response>(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${searchName}`);

    return <List isLoading={isLoading} throttle onSearchTextChange={setSearchName} searchText={searchName} isShowingDetail={isShowingDetail}>
        <List.Section title={`${data?.drinks?.length || 0} drinks`}>
            {data?.drinks?.map(drink => <List.Item key={drink.idDrink} icon={{ source: drink.strDrinkThumb, fallback: Icon.Dot }} title={drink.strDrink} subtitle={drink.strDrinkAlternate || ""} accessories={isShowingDetail ? undefined : [...drink.strTags?.split(",").map(tag => ({tag})) || [], { tag: { value: drink.strAlcoholic, color: drink.strAlcoholic==="Alcoholic" ? Color.Red : Color.Green } }, {date: new Date(drink.dateModified)} ]} detail={<List.Item.Detail markdown={generateDrinkMarkdown(drink)} metadata={<List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="ID" text={drink.idDrink} />
                <List.Item.Detail.Metadata.Label title="Name" text={drink.strDrink} />
                <LinkOrText title="Video" target={drink.strVideo} />
                <List.Item.Detail.Metadata.TagList title="Category">
                    <List.Item.Detail.Metadata.TagList.Item text={drink.strCategory} />
                </List.Item.Detail.Metadata.TagList>
                <List.Item.Detail.Metadata.Label title="Glass" text={drink.strGlass} />
                <List.Item.Detail.Metadata.Separator />
            </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
                <Action title="Toggle Details" icon={Icon.AppWindowSidebarLeft} onAction={() => setIsShowingDetail(prev => !prev)} />
            </ActionPanel>} />)}
        </List.Section>
    </List>
}