import { ActionPanel, Action, List, Icon, getPreferenceValues } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const searchParams = new URLSearchParams({
    domain: "all_content",
    query: searchText.length === 0 ? "" : searchText,
    collapse: "true",
    limit: getPreferenceValues().numSearchResults,
    locale: "en",
  });
  searchParams.append("expand", "breadcrumbs");
  searchParams.append("expand", "-body");

  const { data, isLoading } = useFetch("https://commercequest.space/api/v2/search?" + searchParams, {
    parseResponse: parseFetchResponse,
  });

  const emptyTitle = searchText.length === 0 ? "Recent topics" : "Search results";

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search CommerceQuest forum..."
      throttle
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
  let iconCode;
  switch (searchResult.type) {
    case "discussion":
      iconCode = Icon.SpeechBubbleActive;
      break;
    case "idea":
      iconCode = Icon.LightBulb;
      break;
    case "question":
      iconCode = Icon.QuestionMark;
      break;
    case "category":
      iconCode = Icon.Layers;
      break;
    default:
      iconCode = Icon.Circle;
      break;
  }

  return (
    <List.Item
      title={searchResult.name}
      keywords={[searchResult.recordType]}
      subtitle={searchResult.breadcrumbs}
      accessories={[
        { date: new Date(searchResult.dateUpdated ? searchResult.dateUpdated : searchResult.dateInserted) },
      ]}
      icon={iconCode}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
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

  return json.map(
    (result: {
      breadcrumbs: { name: string }[];
      recordID: any;
      name: any;
      recordType: any;
      type: any;
      dateUpdated: any;
      dateInserted: any;
      url: any;
    }) => {
      let breadcrumbFormatted = "";
      if (result.breadcrumbs) {
        // remove first breadcrumb, it is always "home"
        result.breadcrumbs.shift();

        // remove second one from array and add as start for breadcrumbs
        const secondBreadcrumb = result.breadcrumbs.shift();
        breadcrumbFormatted += secondBreadcrumb?.name;

        // suffix remaining breadcrumbs
        result.breadcrumbs.forEach(function (item: { name: string }) {
          breadcrumbFormatted = breadcrumbFormatted + " » " + item.name;
        });
      }

      return {
        recordID: result.recordID,
        name: result.name,
        recordType: result.recordType,
        type: result.type,
        dateUpdated: result.dateUpdated,
        dateInserted: result.dateInserted,
        url: result.url,
        breadcrumbs: breadcrumbFormatted,
      } as SearchResult;
    }
  );
}

interface SearchResult {
  recordID: string;
  name: string;
  recordType: string;
  type: string;
  dateUpdated: string;
  dateInserted: string;
  url: string;
  breadcrumbs: string;
}
