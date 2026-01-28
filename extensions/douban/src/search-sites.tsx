import { Action, List, ActionPanel, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import * as cheerio from "cheerio";

type Site = {
  category: string;
  title: string;
  url: string;
  cover: string;
  info: string;
};

type SearchResult = Site[];

export default function Command() {
  const [search, setSearch] = useState<string>("");
  const [showingDetail, setShowingDetail] = useState(true);

  const { data, isLoading } = useFetch(`https://www.douban.com/search?q=${search}&cat=2012`, {
    execute: search.trim().length > 0,
    headers: {
      "site-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    },
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const sites: SearchResult = [];
      const data = await response.text();
      if (data) {
        const $ = cheerio.load(data);
        const items = $("div.result");

        items.each((index, item) => {
          const category = $(item).find("h3 span:first")?.text()?.trim() || "";
          const sourceUrl = $(item).find("div.content a")?.prop("href")?.trim() || "";
          const url = new URL(sourceUrl).searchParams.get("url") || "";
          const title = $(item).find("div.title a")?.text()?.trim() || "";
          const cover = $(item).find("img[src^='https']").attr("src") || "";
          const info = $(item).find("div.info")?.text()?.trim() || "";

          const site: Site = {
            category,
            title,
            url,
            cover,
            info,
          };

          sites.push(site);
        });
      }

      return sites;
    },
  });

  function metadata(site: Site) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Info" text={site.info} />
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List
      isShowingDetail={true}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search Sites on Douban"
      onSearchTextChange={(newValue) => setSearch(newValue)}
    >
      {search === "" ? (
        <List.EmptyView />
      ) : (
        data &&
        data.map((site) => (
          <List.Item
            key={site.url}
            title={site.title}
            subtitle={site.category}
            icon={{ source: site.cover }}
            detail={
              <List.Item.Detail
                markdown={`![Illustration](${site.cover})`}
                metadata={showingDetail ? metadata(site) : ""}
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={site.url} />
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowList}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                <Action.CopyToClipboard
                  title="Copy as Markdown"
                  content={`[${site.title}](${site.url})`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
