import {
  Image,
  Icon,
  Color,
  List,
  showToast,
  Toast,
  Action,
  ActionPanel,
  LaunchProps,
  LocalStorage,
  getPreferenceValues,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import axios from "axios";
import cheerio from "cheerio";
import { useEffect, useState } from "react";
import DocCheckPage from "./doccheck-page";

const HISTORY_KEY = "history";
type HistoryItem = {
  title: string;
  url: string;
  imageUrl: string;
  description: string;
  date_publish: string;
  author: string;
};

const LASTRELOAD_KEY = "lastReload";
const TOPARTICLES_KEY = "topArticles";
const CURRENTARTICLES_KEY = "currentArticles";
const PARTICIPATIONARTICLES_KEY = "participationArticles";
const preferences = getPreferenceValues();

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
  const [currentEntries, setCurrentEntries] = useState<Result[]>([]);
  const [participationEntries, setParticipationEntries] = useState<Result[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [noSearchResults, setNoSearchResults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query === "") {
      // if query is empty load Top Articles and History
      getHistory();
      fetchTopArticles();
    } else if (noSearchResults) {
      // if there are no search results load alternative search entries
      setEntries([
        {
          title: "AMBOSS",
          url: "https://next.amboss.com/de/search?q=",
          description: `Press ⏎ to search for "` + query + `" on AMBOSS`,
          title_alias: [],
          imageUrl: "",
          date_publish: "",
          author: "amboss",
        },
        {
          title: "Google",
          url: "https://www.google.com/search?q=",
          description: `Press ⏎ to search for "` + query + `" on Google`,
          title_alias: [],
          imageUrl: "",
          date_publish: "",
          author: "google",
        },
        {
          title: "Wikipedia",
          url: "https://en.wikipedia.org/w/index.php?search=",
          description: `Press ⏎ to search for "` + query + `" on Wikipedia`,
          title_alias: [],
          imageUrl: "",
          date_publish: "",
          author: "google",
        },
        {
          title: "Wikipedia DE",
          url: "https://de.wikipedia.org/w/index.php?search=",
          description: `Press ⏎ to search for "` + query + `" on the German Wikipedia`,
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
      const topArticles: Result[] = [];
      const currentArticles: Result[] = [];
      const participationArticles: Result[] = [];

      if (
        (await LocalStorage.getItem(LASTRELOAD_KEY)) === undefined ||
        new Date().getTime() -
          (new Date((await LocalStorage.getItem(LASTRELOAD_KEY)) as string) ?? new Date()).getTime() >
          preferences.refreshInterval
      ) {
        setLoading(true);
        await LocalStorage.setItem(LASTRELOAD_KEY, new Date().toISOString());

        const response = await axios.get("https://flexikon.doccheck.com/de/");
        const $ = cheerio.load(response.data);

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
        await LocalStorage.setItem(TOPARTICLES_KEY, JSON.stringify(topArticles));

        $(".dc-section.has-bg-gray-100.is-black .is-flex.row-md.column .has-mb-5-md").each((i, el) => {
          const title = $(el).find("a.is-h3").text().trim();
          const url = $(el).find("a.is-h3").attr("href") ?? "";
          const imageUrl = "";
          const description = "";
          const title_alias: string[] = [];

          const relativeTimestamp = $(el)
            .find("span.is-font-size-small")
            .text()
            .trim()
            .replace(/.*, (.*)/gm, `$1`);

          let absoluteDate: Date | null = null;

          if (relativeTimestamp.length !== 0) {
            const match = relativeTimestamp.match(/vor (\d+) (Minute|Minuten|Stunde|Stunden)/);

            if (match) {
              const timeDiff = parseInt(match[1]);
              const unit = match[2];

              absoluteDate = new Date();

              if (unit === "Minute" || unit === "Minuten") {
                absoluteDate.setMinutes(absoluteDate.getMinutes() - timeDiff);
              } else if (unit === "Stunde" || unit === "Stunden") {
                absoluteDate.setHours(absoluteDate.getHours() - timeDiff);
              }
            }
          }

          const date_publish = absoluteDate?.toISOString() || "";
          const author = $(el)
            .find("span.is-font-size-small")
            .text()
            .trim()
            .replace(/(.*),.*/gm, `$1`);

          if (title.length !== 0 && absoluteDate) {
            currentArticles.push({ title, url, imageUrl, description, title_alias, date_publish, author });
          }
        });
        await LocalStorage.setItem(CURRENTARTICLES_KEY, JSON.stringify(currentArticles));

        $(".dc-section.bg-white.is-black .is-flex.row-md.column .has-mb-5-md").each((i, el) => {
          const title = $(el).find("a.is-h3").text().trim();
          const url =
            $(el).find("a.is-h3").attr("href")?.replace(`index.php?title=`, ``).replace(`&veaction=edit`, ``) ?? "";
          const imageUrl = "";
          const description = "";
          const title_alias: string[] = [];
          const date_publish = "";
          const author = "";
          if (title.length != 0) {
            participationArticles.push({ title, url, imageUrl, description, title_alias, date_publish, author });
          }
        });
        await LocalStorage.setItem(PARTICIPATIONARTICLES_KEY, JSON.stringify(participationArticles));
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch top articles",
        message: "Please try again later",
      });
    } finally {
      setEntries(JSON.parse((await LocalStorage.getItem(TOPARTICLES_KEY)) ?? "[]"));
      setCurrentEntries(JSON.parse((await LocalStorage.getItem(CURRENTARTICLES_KEY)) ?? "[]"));
      setParticipationEntries(JSON.parse((await LocalStorage.getItem(PARTICIPATIONARTICLES_KEY)) ?? "[]"));
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

  async function getHistory() {
    const historyString = await LocalStorage.getItem<string>(HISTORY_KEY);
    if (historyString != undefined) {
      const historyArray = JSON.parse(historyString);
      let history = [];
      let thisItem = 0;
      for (let i = historyArray.length - 1; i >= 0; i--) {
        history[thisItem] = historyArray[i];
        thisItem++;
      }
      if (history.length > preferences.historyItemsNumber) {
        history = history.slice(0, preferences.historyItemsNumber);
      }
      setHistoryItems(history);
    }
  }

  if (query === "") {
    // Display Top Articles and History
    return (
      <List
        navigationTitle={`DocCheck`}
        filtering={false}
        onSearchTextChange={async (text) => {
          setNoSearchResults(false);
          setQuery(text);
        }}
        throttle={true}
        isLoading={loading}
        searchBarPlaceholder="Search..."
      >
        <List.Section title={"History"}>
          {historyItems.map((entry) => {
            return (
              <List.Item
                icon={Icon.Book}
                key={entry.url}
                title={{ value: entry.title, tooltip: entry.description }}
                // subtitle={{ value: entry.description, tooltip: entry.description }}
                accessories={[
                  {
                    icon: { source: entry.imageUrl, mask: Image.Mask.Circle },
                    text: entry.author,
                    tooltip: "Created by " + entry.author,
                  },
                  {
                    tag: new Date(
                      entry.date_publish
                        .replace(/(.*),.*/gm, `$1`)
                        .split(".")
                        .reverse()
                        .join("-")
                    ).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }),
                    tooltip: "Last modified " + entry.date_publish,
                  },
                ]}
                actions={EntryActions(entry.url, entry.title, query!)}
              />
            );
          })}
        </List.Section>
        <List.Section title={"Top Artikel"}>
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
        <List.Section title={"Neu erstellt"}>
          {currentEntries.slice(0, 3).map((entry) => {
            return (
              <List.Item
                icon={Icon.Stars}
                key={entry.url}
                title={entry.title}
                // subtitle={{ value: entry.description, tooltip: entry.description }}
                accessories={[
                  { text: entry.author, tooltip: "Created by " + entry.author },
                  {
                    tag: new Date(entry.date_publish),
                    tooltip:
                      "Last modified " +
                      new Date(entry.date_publish).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                  },
                ]}
                actions={EntryActions(entry.url, entry.title, query!)}
              />
            );
          })}
        </List.Section>

        <List.Section title={"Frisch verbessert"}>
          {currentEntries.slice(3, 6).map((entry) => {
            return (
              <List.Item
                icon={Icon.NewDocument}
                key={entry.url}
                title={entry.title}
                // subtitle={{ value: entry.description, tooltip: entry.description }}
                accessories={[
                  { text: entry.author, tooltip: "Edited by " + entry.author },
                  {
                    tag: new Date(entry.date_publish),
                    tooltip:
                      "Last modified " +
                      new Date(entry.date_publish).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                  },
                ]}
                actions={EntryActions(entry.url, entry.title, query!)}
              />
            );
          })}
        </List.Section>

        <List.Section title={"Schreib über"}>
          {participationEntries.slice(0, 3).map((entry) => {
            return (
              <List.Item
                icon={Icon.PlusSquare}
                key={entry.url}
                title={entry.title}
                // subtitle={{ value: entry.description, tooltip: entry.description }}
                actions={
                  <ActionPanel>
                    <Action.Open
                      icon={Icon.TextCursor}
                      title="Write Article in Browser"
                      target={
                        entry.url
                          ? entry.url.replace(/\/[^/]+$/, "/index.php?title=") +
                            entry.url.split("/").pop() +
                            "&veaction=edit"
                          : ""
                      }
                    />
                    <Action.Open
                      icon={Icon.Uppercase}
                      title={`AMBOSS Search "` + entry.title + `"`}
                      target={"https://next.amboss.com/de/search?q=" + encodeURI(entry.title) + "&v=overview"}
                      shortcut={{ modifiers: ["opt"], key: "enter" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={
                        entry.url
                          ? entry.url.replace(/\/[^/]+$/, "/index.php?title=") +
                            entry.url.split("/").pop() +
                            "&veaction=edit"
                          : ""
                      }
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>

        <List.Section title={"Verbessere"}>
          {participationEntries.slice(3, 6).map((entry) => {
            return (
              <List.Item
                icon={Icon.PlusTopRightSquare}
                key={entry.url}
                title={entry.title}
                // subtitle={{ value: entry.description, tooltip: entry.description }}
                actions={EntryActions(entry.url, entry.title, query!)}
              />
            );
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
                        title={`Search "` + query + `" on ` + entry.title}
                        target={entry.url + encodeURI(query)}
                      />
                      <Action.Open
                        icon={Icon.MagnifyingGlass}
                        title={`Search "` + query + `" on DocCheck`}
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
                { icon: Icon.Person, text: entry.author, tooltip: "Created by " + entry.author },
                {
                  tag: new Date(entry.date_publish),
                  tooltip:
                    "Created " +
                    new Date(entry.date_publish).toLocaleDateString("de-DE", {
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
                { icon: Icon.Person, text: entry.author, tooltip: "Created by " + entry.author },
                {
                  tag: new Date(entry.date_publish),
                  tooltip:
                    "Created " +
                    new Date(entry.date_publish).toLocaleDateString("de-DE", {
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
                { icon: Icon.Person, text: entry.author, tooltip: "Created by " + entry.author },
                {
                  tag: new Date(entry.date_publish),
                  tooltip:
                    "Created " +
                    new Date(entry.date_publish).toLocaleDateString("de-DE", {
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
                { icon: Icon.Person, text: entry.author, tooltip: "Created by " + entry.author },
                {
                  tag: new Date(entry.date_publish),
                  tooltip:
                    "Created " +
                    new Date(entry.date_publish).toLocaleDateString("de-DE", {
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
  if (query) {
    return (
      <ActionPanel>
        <Action.Push
          icon={Icon.Book}
          title="Read Article"
          target={<DocCheckPage url={url} navigationItems={""} query={query} />}
          shortcut={{ modifiers: [], key: "arrowRight" }}
        />
        <Action.Open
          icon={Icon.Globe}
          title="Open Article in Browser"
          target={url}
          shortcut={{ modifiers: ["cmd"], key: "enter" }}
        />
        <Action.Open
          icon={Icon.Globe}
          title={`Flexikon Search "` + query + `"`}
          target={"https://www.doccheck.com/search?q=" + encodeURI(query) + "&facetq=content_type:flexikon"}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
        <Action.Open
          icon={Icon.Uppercase}
          title={`AMBOSS Search "` + title + `"`}
          target={"https://next.amboss.com/de/search?q=" + encodeURI(title) + "&v=overview"}
          shortcut={{ modifiers: ["opt"], key: "enter" }}
        />
        <Action.Open
          icon={Icon.Uppercase}
          title={`AMBOSS Search "` + query + `"`}
          target={"https://next.amboss.com/de/search?q=" + encodeURI(query) + "&v=overview"}
          shortcut={{ modifiers: ["opt", "shift"], key: "enter" }}
        />
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel>
        <Action.Push
          icon={Icon.Book}
          title="Read Article"
          target={<DocCheckPage url={url} navigationItems={""} query={query} />}
          shortcut={{ modifiers: [], key: "arrowRight" }}
        />
        <Action.Open
          icon={Icon.Globe}
          title="Open Article in Browser"
          target={url}
          shortcut={{ modifiers: ["cmd"], key: "enter" }}
        />
        <Action.Open
          icon={Icon.Uppercase}
          title={`AMBOSS Search "` + title + `"`}
          target={"https://next.amboss.com/de/search?q=" + encodeURI(title) + "&v=overview"}
          shortcut={{ modifiers: ["opt"], key: "enter" }}
        />
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
      </ActionPanel>
    );
  }
}
