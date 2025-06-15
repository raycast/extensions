import { Action, List, ActionPanel, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import * as cheerio from "cheerio";

type Music = {
  category: string;
  title: string;
  year: string;
  rating: string;
  singers: string[];
  url: string;
  cover: string;
  typ: string;
};

type SearchResult = Music[];

export default function Command() {
  const [search, setSearch] = useState<string>("");
  const [showingDetail, setShowingDetail] = useState(true);

  const { data, isLoading } = useFetch(`https://www.douban.com/search?q=${search}&cat=1003`, {
    execute: search.trim().length > 0,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    },
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const musicList: SearchResult = [];
      const data = await response.text();
      if (data) {
        const $ = cheerio.load(data);
        const items = $("div.result");

        items.each((index, item) => {
          const category = $(item).find("h3 span:first")?.text()?.trim() || "";
          const sourceUrl = $(item).find("div.content a")?.prop("href")?.trim() || "";
          const url = new URL(sourceUrl).searchParams.get("url") || "";
          const title = $(item).find("div.title a")?.text()?.trim() || "";
          const rating = $(item).find("span.rating_nums")?.text()?.trim() || "";
          const subjectEl = $(item).find("span.subject-cast")?.text()?.split("/");
          const year = subjectEl?.pop()?.trim() || "";
          const typ = subjectEl?.pop()?.trim() || "";
          const singers = $(item)
            .find("span.subject-cast")
            ?.text()
            ?.split("/")
            .slice(0, -2)
            .map((singer) => singer.trim()) || [""];
          const cover = $(item).find("img[src^='https']").attr("src") || "";

          const music: Music = {
            category,
            title,
            rating,
            year,
            singers,
            url,
            cover,
            typ,
          };

          musicList.push(music);
        });
      }

      return musicList;
    },
  });

  function metadata(music: Music) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Year" text={music.year} />
        <List.Item.Detail.Metadata.Label title="Rating" text={music.rating} />
        <List.Item.Detail.Metadata.Label title="Singers" text={music.singers && music.singers.join(" / ")} />
        <List.Item.Detail.Metadata.Label title="Type" text={music.typ} />
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List
      isShowingDetail={true}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search Music on Douban"
      onSearchTextChange={(newValue) => setSearch(newValue)}
    >
      {search === "" ? (
        <List.EmptyView />
      ) : (
        data &&
        data.map((music) => (
          <List.Item
            key={music.url}
            title={music.title}
            subtitle={music.category}
            icon={{ source: music.cover }}
            detail={
              <List.Item.Detail
                markdown={`![Illustration](${music.cover})`}
                metadata={showingDetail ? metadata(music) : ""}
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={music.url} />
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowList}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                <Action.CopyToClipboard
                  title="Copy as Markdown"
                  content={`[${music.title}](${music.url})`}
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
