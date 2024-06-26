import { Action, ActionPanel, Color, Icon, LaunchProps, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Response } from "./types";
import { useState } from "react";

export default function SearchCocktailByName(props: LaunchProps<{arguments: Arguments.SearchCocktailByName}>) {
    const { name } = props.arguments;
    const [searchName, setSearchName] = useState(name);
    const [isShowingDetail, setIsShowingDetail] = useState(false);
    const { isLoading, data } = useFetch<Response>(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${searchName}`);

    return <List isLoading={isLoading} throttle onSearchTextChange={setSearchName} searchText={searchName} isShowingDetail={isShowingDetail}>
        <List.Section title={`${data?.drinks?.length || 0} drinks`}>
            {data?.drinks?.map(drink => <List.Item key={drink.idDrink} icon={{ source: drink.strDrinkThumb, fallback: Icon.Dot }} title={drink.strDrink} subtitle={drink.strDrinkAlternate || ""} accessories={isShowingDetail ? undefined : [...drink.strTags?.split(",").map(tag => ({tag})) || [], { tag: { value: drink.strAlcoholic, color: drink.strAlcoholic==="Alcoholic" ? Color.Red : Color.Green } }]} detail={<List.Item.Detail markdown={`![${drink.strDrink}](${drink.strDrinkThumb})`} metadata={<List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="ID" text={drink.idDrink} />
            </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
                <Action title="Toggle Details" icon={Icon.AppWindowSidebarLeft} onAction={() => setIsShowingDetail(prev => !prev)} />
            </ActionPanel>} />)}
        </List.Section>
    </List>
}