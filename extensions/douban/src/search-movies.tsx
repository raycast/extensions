import { Action, List, ActionPanel, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import * as cheerio from "cheerio";

type Movie = {
  category: string;
  title: string;
  year: string;
  rating: string;
  actors: string[];
  url: string;
  cover: string;
};

type SearchResult = Movie[];

export default function Command() {
  const [search, setSearch] = useState<string>("");
  const [showingDetail, setShowingDetail] = useState(true);

  const { data, isLoading } = useFetch(`https://www.douban.com/search?q=${search}&cat=1002`, {
    execute: search.trim().length > 0,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    },
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const movies: SearchResult = [];
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
          const year = $(item).find("span.subject-cast")?.text()?.split("/").pop()?.trim() || "";
          const actors = $(item)
            .find("span.subject-cast")
            ?.text()
            ?.split("/")
            .slice(1, -1)
            .map((actor) => actor.trim()) || [""];
          const cover = $(item).find("img[src^='https']").attr("src") || "";

          const movie: Movie = {
            category,
            title,
            rating,
            year,
            actors,
            url,
            cover,
          };

          movies.push(movie);
        });
      }

      return movies;
    },
  });

  function metadata(movie: Movie) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Year" text={movie.year} />
        <List.Item.Detail.Metadata.Label title="Rating" text={movie.rating} />
        <List.Item.Detail.Metadata.Label title="Actors" text={movie.actors && movie.actors.join(" / ")} />
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List
      isShowingDetail={true}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search Movies on Douban"
      onSearchTextChange={(newValue) => setSearch(newValue)}
    >
      {search === "" ? (
        <List.EmptyView />
      ) : (
        data &&
        data.map((movie) => (
          <List.Item
            key={movie.url}
            title={movie.title}
            subtitle={movie.category}
            icon={{ source: movie.cover }}
            detail={
              <List.Item.Detail
                markdown={`![Illustration](${movie.cover})`}
                metadata={showingDetail ? metadata(movie) : ""}
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={movie.url} />
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowList}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                <Action.CopyToClipboard
                  title="Copy as Markdown"
                  content={`[${movie.title}](${movie.url})`}
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
