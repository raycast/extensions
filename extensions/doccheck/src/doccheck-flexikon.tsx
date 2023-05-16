import { Icon, Color, List, showToast, Toast, Action, ActionPanel, LaunchProps } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import axios from "axios";
import cheerio from "cheerio";
import { useEffect, useState } from "react";
import DocCheckPage from "./doccheck-page";

type Result = {
  title: string;
  url: string;
  imageUrl: string;
  description: string;
  title_alias: string[];
  date_publish: string;
  author: string;
};

export default function Command(props: LaunchProps) {
  const [query, setQuery] = useState<string>(props.fallbackText ?? ""); // if we came here by jumping back from an article (with fallbackText) - this is our query
  const [entries, setEntries] = useState<Result[]>([]);
  const [noSearchResults, setNoSearchResults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query === "") {
      // if query is empty load Top Articles
      fetchTopArticles();
    } else if (noSearchResults) {
      // if there are no search results load alternative search entries
      setEntries([
        {
          title: "AMBOSS",
          url: "https://next.amboss.com/de/search?q=",
          description: "Press ⏎ to search for the search term in AMBOSS in the browser",
          title_alias: [],
          imageUrl: "",
          date_publish: "",
          author: "amboss",
        },
        {
          title: "Google",
          url: "https://www.google.com/search?q=",
          description: "Press ⏎ to search for the search term in Google in the browser",
          title_alias: [],
          imageUrl: "",
          date_publish: "",
          author: "google",
        },
        {
          title: "Wikipedia",
          url: "https://en.wikipedia.org/w/index.php?search=",
          description: "Press ⏎ to search for the search term in Wikipedia in the browser",
          title_alias: [],
          imageUrl: "",
          date_publish: "",
          author: "google",
        },
        {
          title: "Wikipedia DE",
          url: "https://de.wikipedia.org/w/index.php?search=",
          description: "Press ⏎ to search for the search term in the German Wikipedia in the browser",
          title_alias: [],
          imageUrl: "",
          date_publish: "",
          author: "google",
        },
      ]);
    } else {
      searchArticles(query);
    }
  }, [query, noSearchResults]);

  async function fetchTopArticles() {
    try {
      setLoading(true);
      const response = await axios.get("https://flexikon.doccheck.com/de/");
      const $ = cheerio.load(response.data);
      const topArticles: Result[] = [];
      $("#topArticlesSection .row > a, #topArticlesSection .is-grid > a").each((i, el) => {
        const title = $(el).find("h3").text().trim();
        const url = $(el).attr("href") ?? "";
        const imageUrl = $(el).find("img").attr("src") ?? "";
        const description = $(el).find("p").text().trim() ?? "";
        const title_alias: string[] = [];
        const date_publish = "";
        const author = "";
        topArticles.push({ title, url, imageUrl, description, title_alias, date_publish, author });
      });
      setEntries(topArticles);
      setLoading(false);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch top articles",
        message: "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  }
  async function searchArticles(query: string) {
    setEntries([]);
    try {
      setLoading(true);
      const response = await axios.get(
        `https://search.doccheck.com/doccheck-portal/search?q=${query}&language=de&start=0&facetq=content_type:flexikon`
      );
      if (response.status === 200 && response.data.urls != 0) {
        setEntries(response.data.urls);
      } else if (response.status === 200) {
        setNoSearchResults(true);
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch articles",
        message: "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  }

  if (query === "") {
    // Display Top Articles
    return (
      <List
        navigationTitle={`DocCheck Top Articles`}
        filtering={false}
        onSearchTextChange={async (text) => {
          setNoSearchResults(false);
          setQuery(text);
        }}
        throttle={true}
        isLoading={loading}
        searchBarPlaceholder="Search..."
      >
        <List.Section title={"Top Articles"}>
          {entries.map((entry) => {
            if (entry.description) {
              return (
                <List.Item
                  key={entry.url}
                  title={entry.title}
                  icon={entry.imageUrl}
                  subtitle={{ value: entry.description, tooltip: entry.description }}
                  actions={EntryActions(entry.url, entry.title, query!)}
                />
              );
            } else if (entry.imageUrl) {
              return (
                <List.Item
                  key={entry.url}
                  title={entry.title}
                  icon={entry.imageUrl}
                  subtitle={entry.url}
                  actions={EntryActions(entry.url, entry.title, query!)}
                />
              );
            }
          })}
        </List.Section>
      </List>
    );
  } else if (noSearchResults) {
    return (
      <List
        navigationTitle={`DocCheck Flexikon Search`}
        filtering={false}
        onSearchTextChange={async (text) => {
          setNoSearchResults(false);
          setQuery(text);
        }}
        throttle={true}
        isLoading={loading}
        searchBarPlaceholder="Search..."
      >
        <List.Section title={"No search results in Flexikon!"}>
          {entries.map((entry) => {
            if (entry.description) {
              return (
                <List.Item
                  key={entry.description}
                  title={entry.title}
                  subtitle={entry.description}
                  icon={getFavicon("https://" + entry.url.split("/")[2])}
                  actions={
                    <ActionPanel>
                      <Action.Open
                        icon={Icon.Uppercase}
                        title={"Search Term as " + entry.title + " Search"}
                        target={entry.url + encodeURI(query)}
                      />
                      <Action.Open
                        icon={Icon.MagnifyingGlass}
                        title="Search Term as Flexikon Search"
                        target={"https://www.doccheck.com/search?q=" + encodeURI(query)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            }
          })}
        </List.Section>
      </List>
    );
  }

  return (
    // Display Search Entries
    <List
      filtering={false}
      onSearchTextChange={async (text) => {
        setNoSearchResults(false);
        setQuery(text);
      }}
      throttle={true}
      isLoading={loading}
      searchBarPlaceholder="Search..."
    >
      {entries.map((entry) => {
        if (entry.title_alias[2]) {
          return (
            <List.Item
              key={entry.url}
              title={{ value: entry.title, tooltip: entry.title }}
              accessories={[
                { tag: { value: entry.title_alias[0], color: Color.Red }, tooltip: entry.title_alias[0] },
                { tag: { value: entry.title_alias[1], color: Color.Red }, tooltip: entry.title_alias[1] },
                { tag: { value: entry.title_alias[2], color: Color.Red }, tooltip: entry.title_alias[2] },
                { icon: Icon.Person, text: entry.author, tooltip: entry.author },
                {
                  tag: new Date(entry.date_publish),
                  tooltip: new Date(entry.date_publish).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }),
                },
              ]}
              actions={EntryActions(entry.url, entry.title, query)}
            />
          );
        } else if (entry.title_alias[1]) {
          return (
            <List.Item
              key={entry.url}
              title={{ value: entry.title, tooltip: entry.title }}
              accessories={[
                { tag: { value: entry.title_alias[0], color: Color.Red }, tooltip: entry.title_alias[0] },
                { tag: { value: entry.title_alias[1], color: Color.Red }, tooltip: entry.title_alias[1] },
                { icon: Icon.Person, text: entry.author, tooltip: entry.author },
                {
                  tag: new Date(entry.date_publish),
                  tooltip: new Date(entry.date_publish).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }),
                },
              ]}
              actions={EntryActions(entry.url, entry.title, query)}
            />
          );
        } else if (entry.title_alias[0]) {
          return (
            <List.Item
              key={entry.url}
              title={{ value: entry.title, tooltip: entry.title }}
              accessories={[
                { tag: { value: entry.title_alias[0], color: Color.Red }, tooltip: entry.title_alias[0] },
                { icon: Icon.Person, text: entry.author, tooltip: entry.author },
                {
                  tag: new Date(entry.date_publish),
                  tooltip: new Date(entry.date_publish).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }),
                },
              ]}
              actions={EntryActions(entry.url, entry.title, query)}
            />
          );
        } else if (entry.author) {
          return (
            <List.Item
              key={entry.url}
              title={{ value: entry.title, tooltip: entry.title }}
              accessories={[
                { icon: Icon.Person, text: entry.author, tooltip: entry.author },
                {
                  tag: new Date(entry.date_publish),
                  tooltip: new Date(entry.date_publish).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }),
                },
              ]}
              actions={EntryActions(entry.url, entry.title, query)}
            />
          );
        }
      })}
    </List>
  );
}

function EntryActions(url: string, title: string, query: string) {
  return (
    <ActionPanel>
      <Action.Push
        icon={Icon.Book}
        title="Read Article"
        target={<DocCheckPage url={url} prevurl={""} query={query} />}
      />
      <Action.Open
        icon={Icon.Globe}
        title="Open Article in Browser"
        target={url}
        shortcut={{ modifiers: ["cmd"], key: "enter" }}
      />
      <Action.Open
        icon={Icon.MagnifyingGlass}
        title="Search Term as Flexikon Search"
        target={"https://www.doccheck.com/search?q=" + encodeURI(query)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      />
      <Action.Open
        icon={Icon.Uppercase}
        title="Article Title as AMBOSS Search"
        target={"https://next.amboss.com/de/search?q=" + encodeURI(title) + "&v=overview"}
        shortcut={{ modifiers: ["opt"], key: "enter" }}
      />
      <Action.Open
        icon={Icon.Uppercase}
        title="Search Term as AMBOSS Search"
        target={"https://next.amboss.com/de/search?q=" + encodeURI(query) + "&v=overview"}
        shortcut={{ modifiers: ["opt", "shift"], key: "enter" }}
      />
    </ActionPanel>
  );
}
