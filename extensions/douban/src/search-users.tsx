import { Action, List, ActionPanel, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import * as cheerio from "cheerio";

type User = {
  category: string;
  title: string;
  url: string;
  cover: string;
  info: string;
};

type SearchResult = User[];

export default function Command() {
  const [search, setSearch] = useState<string>("");
  const [showingDetail, setShowingDetail] = useState(true);

  const { data, isLoading } = useFetch(`https://www.douban.com/search?q=${search}&cat=1005`, {
    execute: search.trim().length > 0,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    },
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const users: SearchResult = [];
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

          const user: User = {
            category,
            title,
            url,
            cover,
            info,
          };

          users.push(user);
        });
      }

      return users;
    },
  });

  function metadata(user: User) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Info" text={user.info} />
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List
      isShowingDetail={true}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search Users on Douban"
      onSearchTextChange={(newValue) => setSearch(newValue)}
    >
      {search === "" ? (
        <List.EmptyView />
      ) : (
        data &&
        data.map((user) => (
          <List.Item
            key={user.url}
            title={user.title}
            subtitle={user.category}
            icon={{ source: user.cover }}
            detail={
              <List.Item.Detail
                markdown={`![Illustration](${user.cover})`}
                metadata={showingDetail ? metadata(user) : ""}
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={user.url} />
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowList}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                <Action.CopyToClipboard
                  title="Copy as Markdown"
                  content={`[${user.title}](${user.url})`}
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
