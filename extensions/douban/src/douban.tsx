import { Action, List, ActionPanel } from "@raycast/api";
import { useState, useEffect } from "react";
import axios from "axios";
import cheerio from "cheerio";

type Movie = {
  title: string;
  year: string;
  rating: string;
  actors: string[];
  url: string; // 新增属性
  cover: string; // 新增属性
};

type SearchResults = Movie[];

export default function DoubanSearch() {
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResults>([]);

  useEffect(() => {
    async function searchMovies(query: string) {
      try {
        setLoading(true);
        const response = await axios.get(`https://www.douban.com/search?q=${query}&cat=1002`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
          },
        });
        const html = response.data;
        const $ = cheerio.load(html);
        const items = $("div.result");
        const movies: SearchResults = [];

        items.each((index, item) => {
          if (index >= 5) {
            return;
          }

          const titleEl = $(item).find("div.title a");
          const ratingEl = $(item).find("span.rating_nums");
          const yearEl = $(item).find("span.subject-cast:last-child");
          const actorsEl = $(item).find("span.subject-cast:last-child");
          // const linkEl = $(item).find("div.content a.");
          const linkEl = $(item).find("div.content a");
          // console.log(actorsEl);
          const url = linkEl?.prop("href")?.trim() || "2";
          console.log(url);
          const title = titleEl?.text()?.trim() || "Unknown Title";
          const rating = ratingEl?.text()?.trim() || "N/A";
          const year = yearEl?.text()?.trim().split("/").pop() || "Unknown Year";
          const actors = actorsEl
            ?.text()
            ?.trim()
            .split("/")
            .slice(0, -1)
            .map((actor) => actor.trim()) || ["Unknown Actor"];
          const cover = $(item).find("img[src^='https']").attr("src") || "";

          const movie: Movie = {
            title,
            rating,
            year,
            actors,
            url, // 将链接添加到对象中
            cover,
          };

          movies.push(movie);
        });

        setResults(movies);
        setLoading(false);
      } catch (error) {
        console.error("Failed to search movies from Douban:", error);
        setLoading(false);
      }
    }

    if (search.trim().length > 0) {
      searchMovies(search);
    }
  }, [search]);

  const handleSearchTextChange = (searchText: string) => {
    setSearch(searchText);
  };

  return (
    <List
      isShowingDetail
      isLoading={loading}
      searchBarPlaceholder="Search movies on Douban"
      onSearchTextChange={handleSearchTextChange}
    >
      {results.map((movie) => (
        <List.Item
          key={movie.title}
          title={movie.title}
          subtitle={`Date: ${movie.year} | Rating: ${movie.rating} |  ${movie.actors.join(", ")}`}
          // icon={{ source: movie.cover }}
          detail={<List.Item.Detail markdown={`![Illustration](${movie.cover})`} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={movie.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
