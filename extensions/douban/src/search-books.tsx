import { Action, List, ActionPanel, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import * as cheerio from "cheerio";

type Book = {
  category: string;
  title: string;
  year: string;
  rating: string;
  authors: string[];
  url: string;
  cover: string;
  press: string;
};

type SearchResult = Book[];

export default function Command() {
  const [search, setSearch] = useState<string>("");
  const [showingDetail, setShowingDetail] = useState(true);

  const { data, isLoading } = useFetch(`https://www.douban.com/search?q=${search}&cat=1001`, {
    execute: search.trim().length > 0,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    },
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const books: SearchResult = [];
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
          const press = subjectEl?.pop()?.trim() || "";
          const authors = $(item)
            .find("span.subject-cast")
            ?.text()
            ?.split("/")
            .slice(0, -2)
            .map((author) => author.trim()) || [""];
          const cover = $(item).find("img[src^='https']").attr("src") || "";

          const book: Book = {
            category,
            title,
            rating,
            year,
            authors,
            url,
            cover,
            press,
          };

          books.push(book);
        });
      }

      return books;
    },
  });

  function metadata(book: Book) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Year" text={book.year} />
        <List.Item.Detail.Metadata.Label title="Rating" text={book.rating} />
        <List.Item.Detail.Metadata.Label title="Authors" text={book.authors && book.authors.join(" / ")} />
        <List.Item.Detail.Metadata.Label title="Press" text={book.press} />
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List
      isShowingDetail={true}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search Books on Douban"
      onSearchTextChange={(newValue) => setSearch(newValue)}
    >
      {search === "" ? (
        <List.EmptyView />
      ) : (
        data &&
        data.map((book) => (
          <List.Item
            key={book.url}
            title={book.title}
            subtitle={book.category}
            icon={{ source: book.cover }}
            detail={
              <List.Item.Detail
                markdown={`![Illustration](${book.cover})`}
                metadata={showingDetail ? metadata(book) : ""}
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={book.url} />
                <Action
                  title="Toggle Details"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  icon={Icon.AppWindowList}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                <Action.CopyToClipboard
                  title="Copy as Markdown"
                  content={`[${book.title}](${book.url})`}
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
