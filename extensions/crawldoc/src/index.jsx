import { ActionPanel, Action, List, Cache } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { get } from "https";

const cache = new Cache();
var compatibleSites;
try {
  compatibleSites = JSON.parse(cache.get("compatibleSites")) || [];
} catch (error) {
  compatibleSites = [];
}

if (!compatibleSites.length) {
  get("https://crawldoc-api.johanstick.fr/").on("response", (res) => {
    var data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      compatibleSites = JSON.parse(data);
      compatibleSites = compatibleSites.compatibleSites;
      cache.set("compatibleSites", JSON.stringify(compatibleSites));
    });
  });
}

export default function Command() {
  var [searchText, setSearchText] = useState(null);
  var splitQuery = searchText?.split(/\s+/).filter((word) => word !== "");
  var sites = [];

  splitQuery?.forEach((word, index) => {
    // If the user wants to search on a specific site
    if (
      compatibleSites.find(
        (site) =>
          simplifyString(site.name) == simplifyString(word) ||
          simplifyString(site.id) == simplifyString(word) ||
          simplifyString(site.domain) == simplifyString(word) ||
          site.alias?.find((a) => simplifyString(a) === simplifyString(word)),
      )
    ) {
      var site = compatibleSites.find(
        (site) =>
          simplifyString(site.name) == simplifyString(word) ||
          simplifyString(site.id) == simplifyString(word) ||
          simplifyString(site.domain) == simplifyString(word) ||
          site.alias?.find((a) => simplifyString(a) === simplifyString(word)),
      );
      sites.push(site.id);
      splitQuery.splice(index, 1);
      searchText = splitQuery.join(" ");
    }
  });

  // Remove all spaces at end of query
  while (searchText?.endsWith(" "))
    searchText = searchText.substring(0, searchText.length - 1);

  const { data, isLoading } = useFetch(
    "https://crawldoc-api.johanstick.fr/search",
    {
      method: "POST",
      body: JSON.stringify({
        sites,
        query: searchText,
        limit: 30,
        toReturn: [
          "title",
          "source",
          "resultScore",
          "tags",
          "lastUpdated",
          "lang",
        ],
      }),
      headers: {
        "Content-Type": "application/json",
      },
      execute: !!searchText,
      parseResponse: parseFetchResponse,
    },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search with CrawlDoc..."
      throttle
      isShowingDetail={!!searchText && !!sites.length}
    >
      {!searchText && !isLoading ? (
        <List.EmptyView title="Type something to get started" />
      ) : !sites.length && !isLoading ? (
        <List.EmptyView
          title="Unsupported docs services"
          description="Start your query by entering the name of the site you want to search"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Supported Sites"
                url="https://crawldoc.johanstick.fr/listes#services-compatibles"
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Results" subtitle={data?.length + ""}>
          {data?.map((searchResult, index) => (
            <SearchListItem
              key={index + "" + Date.now()}
              searchResult={searchResult}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SearchListItem({ searchResult }) {
  var content = `## ${searchResult?.source?.tree?.join(" → ")}\n---\n${
    escapeMarkdown(searchResult?.source?.content?.join("\n\n")) ||
    "No content found :("
  }`;

  return (
    <List.Item
      title={searchResult?.source?.tree?.join(" → ") || "Loading..."}
      detail={
        <List.Item.Detail
          markdown={
            content.substring(0, 10000) != content
              ? content.substring(0, 10000) + "..."
              : content
          }
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Title"
                text={searchResult.title}
              />
              {searchResult.tags.length ? (
                <List.Item.Detail.Metadata.Label
                  title="Tag"
                  text={searchResult.tags
                    .join(", ")
                    .replace("exact-subtitle", "Exact subtitle")
                    .replace("exact-title", "Exact title")}
                />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Language"
                text={searchResult?.lang?.flag + " " + searchResult?.lang?.code}
              />
              <List.Item.Detail.Metadata.Label
                title="Score"
                text={"" + searchResult.resultScore}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Latest check"
                text={new Intl.DateTimeFormat(undefined, {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                }).format(new Date(searchResult.lastUpdated))}
              />
              <List.Item.Detail.Metadata.Label
                title="Source"
                text={getDomain(searchResult.url || searchResult?.source?.href)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              url={searchResult?.source?.href || searchResult.url}
            />
            <Action.CopyToClipboard
              content={searchResult?.source?.href || searchResult.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseFetchResponse(response) {
  const json = await response.json();

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json;
}

function getDomain(url) {
  if (!url?.startsWith("http://") && !url?.startsWith("https://"))
    url = `https://${url}`;
  return new URL(url).hostname;
}

function escapeMarkdown(text) {
  if (!text) return text;
  return text?.replace(/([\\`*_{}[\]()#+\-.!])/g, "\\$1");
}

function simplifyString(str = "") {
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  str = str
    .toLowerCase()
    .replaceAll("-", "")
    .replaceAll("_", "")
    .replace(/[\t\r\n\s.*?!,:;/§^$%¨£#\\]/g, "")
    .trim();
  return str;
}
