import { ActionPanel, Action, List, Icon, Image, Color, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useFetch(
    "https://learn.microsoft.com/api/apibrowser/dotnet/search?" +
      new URLSearchParams({
        "search": searchText,
        "api-version": "0.2",
        "locale": "en-us" // According to Raycast, we should only support en-US, for now and not use localized requests.
      }),
    {
      parseResponse: parseFetchResponse,
    }
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search .NET API Catalog packages..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      icon={itemTypeToIcon(searchResult.itemType)}
      title={postProcessApiName(searchResult)}
      subtitle={searchResult.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={"https://learn.microsoft.com" + searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function itemTypeToIcon(itemType : SearchResultItemType): { value : Image.ImageLike, tooltip: string }  {
  switch (itemType) {
    case SearchResultItemType.Constructor:
    case SearchResultItemType.Method:
      return { value: { source: Icon.Box, tintColor: Color.Purple }, tooltip: itemType};
    case SearchResultItemType.Event:
      return { value: { source: Icon.Bolt, tintColor: Color.Yellow }, tooltip: itemType};
    case SearchResultItemType.Class:
    case SearchResultItemType.Struct:
      return { value: { source: Icon.Layers, tintColor: Color.Orange }, tooltip: itemType};
    case SearchResultItemType.Enum:
      return { value: { source: Icon.List, tintColor: Color.Orange }, tooltip: itemType};
    case SearchResultItemType.Namespace:
      return { value: { source: Icon.Code, tintColor: Color.Green }, tooltip: itemType};
    case SearchResultItemType.Property:
    case SearchResultItemType.Field:
      return { value: { source: Icon.Code, tintColor: Color.Purple }, tooltip: itemType};
    default:
      return { value: Icon.Code, tooltip: itemType };
  }
}

async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as
    | {
        results: {
          displayName: string;
          url: string;
          itemType: string,
          description: string;
        }[],
        count: number;
      };

  if (!response.ok) {
    return []; // The search API is super weird about certain inputs. If we get an error assume it's something that can't be searched for.
  }

  return json.results.map((result) => {
    return {
      name: result.displayName,
      description: result.description,
      itemType: result.itemType,
      url: result.url,
    } as SearchResult;
  });
}

function postProcessApiName(item : SearchResult): string {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.truncate) {
    return item.name;
  }

  let lastDot = item.name.lastIndexOf('.');

  if (lastDot <= 10) {
    return item.name;
  }

  switch (item.itemType) {
    case SearchResultItemType.Class:
    case SearchResultItemType.Struct:
    case SearchResultItemType.Constructor:
    case SearchResultItemType.Delegate:
    case SearchResultItemType.Enum:
      return item.name.substring(lastDot + 1);
    case SearchResultItemType.Method:
    case SearchResultItemType.Property:
    case SearchResultItemType.Event:
      let secondToLastDot = item.name.lastIndexOf('.', lastDot - 1);
      if (secondToLastDot >= 0) {
        return item.name.substring(secondToLastDot + 1);
      }

      return item.name.substring(lastDot + 1);
    default:
      return item.name;
  }
}

enum SearchResultItemType {
  Method = "Method",
  Class = "Class",
  Struct = "Struct",
  Constructor = "Constructor",
  Event = "Event",
  Delegate = "Delegate",
  Enum = "Enum",
  Property = "Property",
  Namespace = "Namespace",
  Field = "Field"
}

interface SearchResult {
  name: string;
  description: string;
  itemType: SearchResultItemType;
  url: string;
}

interface Preferences {
  truncate: boolean
}