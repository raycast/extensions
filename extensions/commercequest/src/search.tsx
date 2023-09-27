import { ActionPanel, Action, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";
import { mapIconCode } from "./lib/utils";

import Preview from "./components/Preview";
import { Breadcrumb, User, SearchResult, ItemType } from "./lib/types";

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

function ItemTypeDropdown(props: { itemTypes: ItemType[]; onItemTypeChange: (newValue: string) => void }) {
  const { itemTypes, onItemTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Type"
      defaultValue=""
      storeValue={true}
      onChange={(newValue) => {
        onItemTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Item Types">
        {itemTypes.map((itemType) => (
          <List.Dropdown.Item key={itemType.id} title={itemType.name} value={itemType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function fetchItems(searchText: string, filterItemType: string) {
  const searchParams = new URLSearchParams({
    query: searchText.length === 0 ? "" : searchText,
    collapse: "true",
    limit: getPreferenceValues().numSearchResults,
    locale: "en",
  });
  searchParams.append("expand", "breadcrumbs");
  searchParams.append("expand", "-body");
  searchParams.append("expand", "insertUser");
  searchParams.append("types", filterItemType);

  const { data, isLoading } = useFetch("https://commercequest.space/api/v2/search?" + searchParams, {
    parseResponse: parseFetchResponse,
  });

  return {
    data,
    isLoading,
  };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filterItemType, setFilterItemType] = useState("");

  const emptyTitle = searchText.length === 0 ? "Recent topics" : "Search results";

  const { data, isLoading } = fetchItems(searchText, filterItemType);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search CommerceQuest forum..."
      throttle
      searchBarAccessory={<ItemTypeDropdown itemTypes={itemTypes} onItemTypeChange={setFilterItemType} />}
    >
      <List.Section title={emptyTitle} subtitle={data?.length + ""}>
        {data?.map((searchResult: SearchResult) => (
          <SearchListItem key={searchResult.recordID} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const date = new Date(searchResult.dateUpdated ? searchResult.dateUpdated : searchResult.dateInserted);

  return (
    <List.Item
      title={searchResult.name}
      keywords={[searchResult.recordType]}
      subtitle={searchResult.breadcrumbsFormatted}
      accessories={[{ date: date, tooltip: date.toLocaleString() }]}
      icon={mapIconCode(searchResult.type)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={searchResult.url} />
            {searchResult.type != "category" ? (
              <Action.Push title="Preview" target={<Preview {...searchResult} />} />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  const json = await response.json();

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  // @TODO import tagIds and display on Detail
  return json.map(
    (result: {
      breadcrumbs: Breadcrumb[];
      recordID: string;
      name: string;
      recordType: string;
      type: string;
      dateUpdated: string;
      dateInserted: string;
      url: string;
      body: string;
      insertUser?: User;
    }) => {
      let breadcrumbsFormatted = "";
      const breadcrumbs: Breadcrumb[] = [];
      if (result.breadcrumbs) {
        // remove first breadcrumb, it is always "home"
        result.breadcrumbs.shift();

        // remove second one from array and add as start for breadcrumbs
        const secondBreadcrumb = result.breadcrumbs.shift();
        if (secondBreadcrumb) {
          breadcrumbsFormatted += secondBreadcrumb.name;
          breadcrumbs.push(secondBreadcrumb);
        }

        // suffix remaining breadcrumbs
        result.breadcrumbs.forEach(function (breadcrumb: Breadcrumb) {
          breadcrumbsFormatted = breadcrumbsFormatted + " » " + breadcrumb.name;
          breadcrumbs.push(breadcrumb);
        });
      }

      let insertUser = null;
      if (result.insertUser) {
        insertUser = {
          name: result.insertUser.name,
          photoUrl: result.insertUser.photoUrl,
          url: result.insertUser.url,
          label: result.insertUser.label,
          title: result.insertUser.title,
        } as User;
      }

      return {
        recordID: result.recordID,
        name: result.name,
        recordType: result.recordType,
        type: result.type,
        dateUpdated: result.dateUpdated,
        dateInserted: result.dateInserted,
        url: result.url,
        breadcrumbsFormatted: breadcrumbsFormatted,
        breadcrumbs: breadcrumbs,
        body: result.body,
        insertUser: insertUser,
      } as SearchResult;
    }
  );
}
