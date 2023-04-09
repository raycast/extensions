import { Icon, Color, Detail, List, showToast, Toast, Action, ActionPanel } from "@raycast/api";
import axios from "axios";
import cheerio from "cheerio";
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import { NodeHtmlMarkdown } from "node-html-markdown";
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

export default function Command() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Result[]>([]);
  const [entries, setEntries] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      if (!query) {
        setState([]);
        await axios
          .get("https://flexikon.doccheck.com/de/")
          .then((response) => {
            const $ = cheerio.load(response.data);
            const topArticles: Result[] = [];

            $("#topArticlesSection .row > a, #topArticlesSection .is-grid > a").each((i, el) => {
              const title = $(el).find("h3").text().trim();
              const url = $(el).attr("href") ?? "";
              const imageUrl = $(el).find("img").attr("src") ? $(el).find("img").attr("src")!.replace(" ", "") : "";
              const description = $(el).find("p").text().trim();
              const title_alias: string[] = [];
              const date_publish = "";
              const author = "";
              topArticles.push({ title, url, imageUrl, description, title_alias, date_publish, author });
            });
            setEntries(topArticles);
            setLoading(false);
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
        setEntries([]);
        try {
          const response = await axios.get(
            `https://search.doccheck.com/doccheck-portal/search?q=${query}&language=de&start=0&facetq=content_type:flexikon`
          );
          if (response.status === 200 && response.data.urls != 0) {
            setEntries(response.data.urls);
          } else if (response.status === 200) {
            setEntries([
              {
                title: "Keine Suchergebnisse im Flexikon!",
                url: "",
                description: "Drücke ⏎ um den Suchbegriff auf AMBOSS im Browser zu suchen",
                title_alias: [],
                imageUrl: "",
                date_publish: "",
                author: "",
              },
            ]);
          }
        } catch (e) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch entries",
            message: "Please try again later",
          });
        } finally {
          setLoading(false);
        }
      }
    }
    fetch();
  }, [query]);

  if (entries === null) {
    return <List isLoading={true} searchBarPlaceholder="Search entry..." />;
  }

  if (!query) {
    return (
      <List
        navigationTitle={`DocCheck Flexikon Suche`}
        filtering={false}
        onSearchTextChange={(text) => {
          setQuery(text);
        }}
        throttle={true}
        isLoading={loading}
        searchBarPlaceholder="Search entry..."
      >
        <List.Section title={!query ? "Top Artikel" : "XXX"} subtitle={""}>
          {entries.map((entry) => {
            if (entry.description) {
              return (
                <List.Item
                  key={entry.url}
                  title={entry.title}
                  icon={entry.imageUrl}
                  subtitle={entry.description}
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
  } else if (query.length != 0) {
    return (
      <List
        navigationTitle={`DocCheck Flexikon Suche`}
        filtering={false}
        onSearchTextChange={(text) => {
          setQuery(text);
        }}
        throttle={true}
        isLoading={loading}
        searchBarPlaceholder="Search entry..."
      >
        {entries.map((entry) => {
          if (entry.description) {
            return (
              <List.Item
                key={entry.description}
                title={entry.title}
                icon={entry.imageUrl}
                subtitle={entry.description}
                actions={
                  <ActionPanel>
                    <Action.Open
                      icon={Icon.Uppercase}
                      title="Suchbegriff als AMBOSS-Suche"
                      target={"https://next.amboss.com/de/search?q=" + encodeURI(query) + "&v=overview"}
                    />
                    <Action.Open
                      icon={Icon.MagnifyingGlass}
                      title="Suchbegriff als Flexikon-Suche"
                      target={"https://www.doccheck.com/search?q=" + encodeURI(query)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    />
                  </ActionPanel>
                }
              />
            );
          } else if (entry.title_alias[2]) {
            return (
              <List.Item
                key={entry.url}
                title={entry.title}
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
                title={entry.title}
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
                title={entry.title}
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
          } else if (entry.title) {
            return (
              <List.Item
                key={entry.url}
                title={entry.title}
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
}

function EntryActions(url: string, title: string, query: string) {
  return (
    <ActionPanel>
      <Action.Push icon={Icon.Book} title="Eintrag lesen" target={<DocCheckPage prevtitle={''} prevurl={''} title={title} url={url} />} />
      <Action.Open
        icon={Icon.Globe}
        title="Eintrag im Browser öffnen"
        target={url}
        shortcut={{ modifiers: ["cmd"], key: "enter" }}
      />
      <Action.Open
        icon={Icon.MagnifyingGlass}
        title="Suchbegriff als Flexikon-Suche"
        target={"https://www.doccheck.com/search?q=" + encodeURI(query)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      />
      <Action.Open
        icon={Icon.Uppercase}
        title="Eintrag als AMBOSS-Suche"
        target={"https://next.amboss.com/de/search?q=" + encodeURI(title) + "&v=overview"}
        shortcut={{ modifiers: ["opt"], key: "enter" }}
      />
      <Action.Open
        icon={Icon.Uppercase}
        title="Suchbegriff als AMBOSS-Suche"
        target={"https://next.amboss.com/de/search?q=" + encodeURI(query) + "&v=overview"}
        shortcut={{ modifiers: ["opt", "shift"], key: "enter" }}
      />
    </ActionPanel>
  );
}
