import { Action, List, ActionPanel, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import * as cheerio from "cheerio";

type Group = {
  category: string;
  title: string;
  url: string;
  cover: string;
  member: string;
};

type SearchResult = Group[];

export default function Command() {
  const [search, setSearch] = useState<string>("");
  const [showingDetail, setShowingDetail] = useState(true);

  const { data, isLoading } = useFetch(`https://www.douban.com/search?q=${search}&cat=1019`, {
    execute: search.trim().length > 0,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    },
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const groups: SearchResult = [];
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
          const member = $(item).find("div.info")?.text()?.trim() || "";

          const group: Group = {
            category,
            title,
            url,
            cover,
            member,
          };

          groups.push(group);
        });
      }

      return groups;
    },
  });

  function metadata(group: Group) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Member" text={group.member} />
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List
      isShowingDetail={true}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search Groups on Douban"
      onSearchTextChange={(newValue) => setSearch(newValue)}
    >
      {search === "" ? (
        <List.EmptyView />
      ) : (
        data &&
        data.map((group) => (
          <List.Item
            key={group.url}
            title={group.title}
            subtitle={group.category}
            icon={{ source: group.cover }}
            detail={
              <List.Item.Detail
                markdown={`![Illustration](${group.cover})`}
                metadata={showingDetail ? metadata(group) : ""}
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={group.url} />
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowList}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                <Action.CopyToClipboard
                  title="Copy As Markdown"
                  content={`[${group.title}](${group.url})`}
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
