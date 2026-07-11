import { List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";

import { Breadcrumb, SearchResult, ItemType, ItemGroup } from "./lib/types";
import SearchListItem from "./components/SearchListItem";
import ItemTypeDropdown from "./components/ItemTypeDropdown";

const itemTypes: ItemType[] = [
  { id: "", name: "All" },
  { id: "article", name: "Articles" },
  { id: "discussion", name: "Discussions" },
  { id: "comment", name: "Comments" },
  { id: "question", name: "Questions" },
  { id: "answer", name: "Answers" },
  { id: "group", name: "Groups" },
  { id: "poll", name: "Polls" },
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filterItemType, setFilterItemType] = useState("");

  const { data, isLoading } = fetchItems(searchText, filterItemType);
  const itemGroups = groupItemsByDate(data);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search CommerceQuest forum..."
      throttle
      searchBarAccessory={<ItemTypeDropdown itemTypes={itemTypes} onItemTypeChange={setFilterItemType} />}
    >
      {itemGroups.map((itemGroup: ItemGroup) => (
        <List.Section title={itemGroup.title} subtitle={itemGroup.items.length.toString()} key={itemGroup.title}>
          {itemGroup.items.map((searchResult: SearchResult) => (
            <SearchListItem key={searchResult.recordID} searchResult={searchResult} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function fetchItems(searchText: string, filterItemType: string) {
  const searchParams = new URLSearchParams({
    query: searchText.length === 0 ? "" : searchText,
    collapse: "true",
    limit: getPreferenceValues().numSearchResults,
    locale: "en",
    types: filterItemType,
  });

  searchParams.append("expand", "breadcrumbs");
  searchParams.append("expand", "-body");
  searchParams.append("expand", "insertUser");

  return useFetch("https://forum.commercequest.space/api/v2/search?" + searchParams, {
    parseResponse: parseFetchResponse,
    keepPreviousData: true,
  });
}

async function parseFetchResponse(response: Response) {
  const json = await response.json();

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.map((result: SearchResult) => {
    let breadcrumbsFormatted = "";
    const breadcrumbs: Breadcrumb[] = [];
    if (result.breadcrumbs) {
      // remove first breadcrumb because it is always "home"
      result.breadcrumbs.shift();

      // remove second one from array and add as start for breadcrumbs
      const secondBreadcrumb = result.breadcrumbs.shift();
      if (secondBreadcrumb) {
        breadcrumbsFormatted = secondBreadcrumb.name;
        breadcrumbs.push(secondBreadcrumb);
      }

      // append remaining breadcrumbs
      result.breadcrumbs.forEach(function (breadcrumb: Breadcrumb) {
        breadcrumbsFormatted = breadcrumbsFormatted + " » " + breadcrumb.name;
        breadcrumbs.push(breadcrumb);
      });
    }

    result.breadcrumbs = breadcrumbs;
    result.breadcrumbsFormatted = breadcrumbsFormatted;

    return result;
  });
}

function groupItemsByDate(searchResults: SearchResult[]) {
  const itemsGrouped = [
    { title: "Today", items: [] } as ItemGroup,
    { title: "Yesterday", items: [] } as ItemGroup,
    { title: "Last week", items: [] } as ItemGroup,
    { title: "Older", items: [] } as ItemGroup,
  ];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

  if (!searchResults) {
    return itemsGrouped;
  }

  searchResults.forEach(function (searchResult: SearchResult) {
    const dateInserted = new Date(searchResult.dateInserted);

    if (dateInserted.valueOf() >= today.valueOf()) {
      itemsGrouped[0].items.push(searchResult);
    } else if (dateInserted.valueOf() >= yesterday.valueOf()) {
      itemsGrouped[1].items.push(searchResult);
    } else if (dateInserted.valueOf() >= lastWeek.valueOf()) {
      itemsGrouped[2].items.push(searchResult);
    } else {
      itemsGrouped[3].items.push(searchResult);
    }
  });

  return itemsGrouped;
}
