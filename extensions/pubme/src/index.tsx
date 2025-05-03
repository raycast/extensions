import {
  Icon,
  Color,
  ActionPanel,
  Detail,
  List,
  Action,
  preferences,
  Clipboard,
  LocalStorage,
  getPreferenceValues,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import cheerio from "cheerio";
import { NodeHtmlMarkdown } from "node-html-markdown";

interface Article {
  uid: string;
  title: string;
  url: string;
  authors: string[];
  pubdate: string;
  epubdate: string;

  doi: string;
  pmid: string;
  pmc: string;

  fulljournalname: string;
  volume: string;
  issue: string;
  pages: string;
}

const categories = [
  {
    title: "Relevance",
    value: "relevance",
  },
  {
    title: "Author",
    value: "author",
  },
  {
    title: "Publication date",
    value: "pub+date",
  },
  {
    title: "Most recent",
    value: "most+recent",
  },
];

const HISTORY_KEY = "history";
const FAVOURITES_KEY = "favourites";
const LASTRELOAD_KEY = "lastReload";
const TRENDINGARTICLES_KEY = "trendingArticles";

export default function Command() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Article[]>([]);
  const [entries, setEntries] = useState<Article[]>([]);
  const [historyItems, setHistoryItems] = useState<Article[]>([]);
  const [favouriteItems, setFavouriteItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>();
  const [count, setCount] = useState<string>();

  useEffect(() => {
    fetchData();
  }, [query, sortBy]);

  async function fetchData() {
    const apikeyArgument = preferences.apikey.value === "0" ? "" : `&api_key=${preferences.apikey.value}`;
    if (!query) {
      controllToast("Loading Trending Articles", true);
      getHistoryAndFavourites();
      try {
        if (
          (await LocalStorage.getItem(LASTRELOAD_KEY)) === undefined ||
          new Date().getTime() -
            (new Date((await LocalStorage.getItem(LASTRELOAD_KEY)) as string) ?? new Date()).getTime() >
            (preferences.refreshInterval.value as number)
        ) {
          await LocalStorage.setItem(LASTRELOAD_KEY, new Date().toISOString());
          setLoading(true);
          const trendinghResponse = await fetch("https://pubmed.ncbi.nlm.nih.gov/trending/");

          if (trendinghResponse.ok) {
            const searchTrending = await trendinghResponse.text();
            const $ = cheerio.load(searchTrending);
            const trendingPmidsList: string[] = [];

            $(".docsum-wrap").each((index, element) => {
              const pmid = $(element).find(".docsum-pmid").text();
              trendingPmidsList.push(pmid);
            });

            if (trendingPmidsList.length !== 0) {
              const summaryUrl =
                `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${trendingPmidsList.join(
                  ","
                )}&version=2.0&retmode=json` + apikeyArgument;

              const summaryResponse = await fetch(summaryUrl);
              if (summaryResponse.ok) {
                const summaryJson = await summaryResponse.json();
                const articles: Article[] = Object.values(summaryJson.result).map((doc: any) => {
                  const uid = doc.uid;
                  const title = doc.title;
                  const url = `https://pubmed.ncbi.nlm.nih.gov/${uid}/`;
                  const authors = doc.authors ? doc.authors.map((author: any) => author.name) : [];
                  const pubdate = doc.pubdate; // if there is an epubdate take this
                  const epubdate = doc.epubdate;

                  const doiList = doc.articleids ? doc.articleids.filter((id: any) => id.idtype === "doi") : [];
                  const doi = doiList.length > 0 ? doiList[0].value : "";
                  const pmid = doc.articleids
                    ? doc.articleids.filter((id: any) => id.idtype === "pubmed")[0].value
                    : "";

                  // const pmcid = doc.articleids ? doc.articleids.filter((id: any) => id.idtype === "pmc")[0].value : "";

                  const pmcList = doc.articleids ? doc.articleids.filter((id: any) => id.idtype === "pmc") : [];
                  const pmc = pmcList.length > 0 ? pmcList[0].value : "";

                  const fulljournalname = doc.fulljournalname ? doc.fulljournalname : "";
                  const volume = doc.volume ? doc.volume : "";
                  const issue = doc.issue ? doc.issue : "";
                  const pages = doc.pages ? doc.pages : "";

                  return {
                    uid,
                    title,
                    url,
                    authors,
                    pubdate,
                    epubdate,
                    doi,
                    pmid,
                    pmc,
                    fulljournalname,
                    volume,
                    issue,
                    pages,
                  };
                });

                //somehow the articles are sorted by there pmid and not by the initial search order
                const sortedArticles = articles.sort((a, b) => {
                  const indexA = trendingPmidsList.indexOf(a.pmid);
                  const indexB = trendingPmidsList.indexOf(b.pmid);
                  return indexA - indexB;
                });
                await LocalStorage.setItem(TRENDINGARTICLES_KEY, JSON.stringify(sortedArticles));
                setLoading(false);
              } else {
                setEntries([
                  {
                    uid: "42",
                    title: "Nothing found!",
                    url: "<empty>",
                    authors: [],
                    doi: "",
                    pmid: "",
                    pmc: "",
                    pubdate: "",
                    epubdate: "",
                    fulljournalname: "Press ⏎ to open the search in the browser",
                    volume: "",
                    issue: "",
                    pages: "",
                  },
                ]);
                setLoading(false);
              }
            } else {
              throw new Error(`Error fetching search data: ${trendinghResponse.status}`);
            }
          }
        }
      } catch (error) {
        console.error(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch entries",
          message: (error as Error).message,
        });
      } finally {
        setEntries(JSON.parse((await LocalStorage.getItem(TRENDINGARTICLES_KEY)) ?? "[]"));
        controllToast("Loading Trending Articles", false);
        setLoading(false);
      }
    } else {
      controllToast(`Searching for "` + query + `"`, true);
      setLoading(true);
      try {
        const searchUrl =
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=${preferences.retmax.value}&sort=${sortBy}&term=${query}&retmode=json` +
          apikeyArgument;

        const searchResponse = await fetch(searchUrl);
        if (searchResponse.ok) {
          const searchJson = await searchResponse.json();
          setCount(searchJson.esearchresult.count);
          if (searchJson.esearchresult.count[0] != "0") {
            // const ids = searchJson.esearchresult.idlist[0].split(",");
            // const idList = escape(ids.join(","));
            const idList = searchJson.esearchresult.idlist.join(",");

            const summaryUrl =
              `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList}&version=2.0&retmode=json` +
              apikeyArgument;

            const summaryResponse = await fetch(summaryUrl);
            if (summaryResponse.ok) {
              const summaryJson = await summaryResponse.json();
              const articles: Article[] = Object.values(summaryJson.result).map((doc: any) => {
                const uid = doc.uid;
                const title = doc.title;
                const url = `https://pubmed.ncbi.nlm.nih.gov/${uid}/`;
                const authors = doc.authors ? doc.authors.map((author: any) => author.name) : [];
                const pubdate = doc.pubdate; // if there is an epubdate take this
                const epubdate = doc.epubdate;

                const doiList = doc.articleids ? doc.articleids.filter((id: any) => id.idtype === "doi") : [];
                const doi = doiList.length > 0 ? doiList[0].value : "";
                const pmid = doc.articleids ? doc.articleids.filter((id: any) => id.idtype === "pubmed")[0].value : "";

                // const pmcid = doc.articleids ? doc.articleids.filter((id: any) => id.idtype === "pmc")[0].value : "";

                const pmcList = doc.articleids ? doc.articleids.filter((id: any) => id.idtype === "pmc") : [];
                const pmc = pmcList.length > 0 ? pmcList[0].value : "";

                const fulljournalname = doc.fulljournalname ? doc.fulljournalname : "";
                const volume = doc.volume ? doc.volume : "";
                const issue = doc.issue ? doc.issue : "";
                const pages = doc.pages ? doc.pages : "";

                return {
                  uid,
                  title,
                  url,
                  authors,
                  pubdate,
                  epubdate,
                  doi,
                  pmid,
                  pmc,
                  fulljournalname,
                  volume,
                  issue,
                  pages,
                };
              });

              //somehow the articles are sorted by there pmid and not by the initial search order
              const sortedArticles = articles.sort((a, b) => {
                const indexA = idList.indexOf(a.pmid);
                const indexB = idList.indexOf(b.pmid);
                return indexA - indexB;
              });

              setEntries(sortedArticles);
              setLoading(false);
            } else {
              throw new Error(`Error fetching summary data: ${summaryResponse.status}`);
            }
          } else {
            setEntries([
              {
                uid: "42",
                title: "Nothing found!",
                url: "<empty>",
                authors: [],
                doi: "",
                pmid: "",
                pmc: "",
                pubdate: "",
                epubdate: "",
                fulljournalname: "Press ⏎ to open the search in the browser",
                volume: "",
                issue: "",
                pages: "",
              },
            ]);
            setLoading(false);
          }
        } else {
          throw new Error(`Error fetching search data: ${searchResponse.status}`);
        }
      } catch (error) {
        console.error(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch entries",
          message: (error as Error).message,
        });
        setLoading(false);
      } finally {
        controllToast("Searching articles", false);
      }
    }
  }

  async function getHistoryAndFavourites() {
    const historyString = await LocalStorage.getItem<string>(HISTORY_KEY);
    if (historyString != undefined) {
      const historyArray = JSON.parse(historyString);
      let history = [];
      let thisItem = 0;
      for (let i = historyArray.length - 1; i >= 0; i--) {
        history[thisItem] = historyArray[i];
        thisItem++;
      }
      if (history.length > Number.parseInt(String(preferences.historyItemsNumber.value), 10)) {
        history = history.slice(0, Number.parseInt(String(preferences.historyItemsNumber.value), 10));
      }
      setHistoryItems(history);
    } else {
      setHistoryItems([]);
    }

    const favouritesString = await LocalStorage.getItem<string>(FAVOURITES_KEY);
    if (favouritesString != undefined) {
      const favouritesArray = JSON.parse(favouritesString);
      const favourites = [];
      let thisItem = 0;
      for (let i = favouritesArray.length - 1; i >= 0; i--) {
        favourites[thisItem] = favouritesArray[i];
        thisItem++;
      }
      setFavouriteItems(favourites);
    } else {
      setFavouriteItems([]);
    }
  }

  if (query === null || query === "") {
    // Display History, Top Articles and Favourites
    return (
      <List
        navigationTitle={`PubMe Search`}
        filtering={false}
        onSearchTextChange={(text) => {
          setQuery(text);
        }}
        throttle={true}
        isLoading={loading}
        searchBarPlaceholder="Search..."
        searchBarAccessory={
          <List.Dropdown
            tooltip="Sort by"
            storeValue={true}
            onChange={(newValue) => {
              setSortBy(newValue);
            }}
          >
            {!query
              ? ""
              : categories.map((loc) => (
                  <List.Dropdown.Item
                    key={loc.value}
                    title={loc.title}
                    value={loc.value}
                    keywords={[loc.title, loc.value]}
                  />
                ))}
          </List.Dropdown>
        }
      >
        <List.Section title={"History"}>
          {historyItems.map((entry) => {
            return listItems(entry, Icon.Book, "");
          })}
        </List.Section>

        <List.Section title={"Favourites"}>
          {favouriteItems.map((entry) => {
            return listItems(entry, Icon.Star, "favourite");
          })}
        </List.Section>

        <List.Section title={"Trending"} subtitle={query && count ? count.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""}>
          {entries.map((entry) => {
            return listItems(entry, Icon.Stars, "");
          })}
        </List.Section>
      </List>
    );
  } else {
    return (
      <List
        navigationTitle={`PubMe Search`}
        filtering={false}
        onSearchTextChange={(text) => {
          setQuery(text);
        }}
        throttle={true}
        isLoading={loading}
        searchBarPlaceholder="Search..."
        searchBarAccessory={
          <List.Dropdown
            tooltip="Sort by"
            storeValue={true}
            onChange={(newValue) => {
              setSortBy(newValue);
            }}
          >
            {!query
              ? ""
              : categories.map((loc) => (
                  <List.Dropdown.Item
                    key={loc.value}
                    title={loc.title}
                    value={loc.value}
                    keywords={[loc.title, loc.value]}
                  />
                ))}
          </List.Dropdown>
        }
      >
        <List.Section title={"Results"} subtitle={query && count ? count.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""}>
          {entries.map((entry) => {
            return listSearchItems(entry);
          })}
        </List.Section>
      </List>
    );
  }

  function listItems(entry: Article, icon: Icon, options: string) {
    if (entry.pmc && entry.doi) {
      return (
        <List.Item
          key={entry.uid}
          icon={icon}
          title={{ value: entry.title, tooltip: entry.title }}
          accessories={[
            { icon: Icon.Person, text: entry.authors[0], tooltip: entry.authors.join(", ") },
            { tag: { value: "PMC", color: Color.Green }, tooltip: entry.pmc },
            { tag: { value: "DOI", color: Color.Red }, tooltip: entry.doi },
            { tag: { value: "PMID", color: Color.Blue }, tooltip: entry.pmid },
            {
              tag: new Date(entry.epubdate ? entry.epubdate : entry.pubdate),
              tooltip: new Date(entry.epubdate ? entry.epubdate : entry.pubdate).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }),
            },
          ]}
          actions={EntryActions(entry, query!, sortBy!, getHistoryAndFavourites, fetchData, options)}
        />
      );
    } else if (entry.doi) {
      return (
        <List.Item
          key={entry.uid}
          icon={icon}
          title={{ value: entry.title, tooltip: entry.title }}
          accessories={[
            { icon: Icon.Person, text: entry.authors[0], tooltip: entry.authors.join(", ") },
            { tag: { value: "DOI", color: Color.Red }, tooltip: entry.doi },
            { tag: { value: "PMID", color: Color.Blue }, tooltip: entry.pmid },
            {
              tag: new Date(entry.epubdate ? entry.epubdate : entry.pubdate),
              tooltip: new Date(entry.epubdate ? entry.epubdate : entry.pubdate).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }),
            },
          ]}
          actions={EntryActions(entry, query!, sortBy!, getHistoryAndFavourites, fetchData, options)}
        />
      );
    } else if (entry.url === "<empty>") {
      return (
        <List.Item
          key={entry.uid}
          icon={icon}
          title={entry.title}
          subtitle={entry.fulljournalname}
          actions={
            <ActionPanel>
              <Action.Open
                icon={Icon.MagnifyingGlass}
                title="Open Search in Browser"
                target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
              />
            </ActionPanel>
          }
        />
      );
    } else if (entry.title) {
      return (
        <List.Item
          key={entry.uid}
          icon={icon}
          title={{ value: entry.title, tooltip: entry.title }}
          accessories={[
            { icon: Icon.Person, text: entry.authors[0], tooltip: entry.authors.join(", ") },
            { tag: { value: "PMID", color: Color.Blue }, tooltip: entry.pmid },
            {
              tag: new Date(entry.epubdate ? entry.epubdate : entry.pubdate),
              tooltip: new Date(entry.epubdate ? entry.epubdate : entry.pubdate).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }),
            },
          ]}
          actions={EntryActions(entry, query!, sortBy!, getHistoryAndFavourites, fetchData, options)}
        />
      );
    }
  }
  function listSearchItems(entry: Article) {
    if (entry.pmc && entry.doi) {
      return (
        <List.Item
          key={entry.uid}
          title={{ value: entry.title, tooltip: entry.title }}
          accessories={[
            { icon: Icon.Person, text: entry.authors[0], tooltip: entry.authors.join(", ") },
            { tag: { value: "PMC", color: Color.Green }, tooltip: entry.pmc },
            { tag: { value: "DOI", color: Color.Red }, tooltip: entry.doi },
            { tag: { value: "PMID", color: Color.Blue }, tooltip: entry.pmid },
            {
              tag: new Date(entry.epubdate ? entry.epubdate : entry.pubdate),
              tooltip: new Date(entry.epubdate ? entry.epubdate : entry.pubdate).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }),
            },
          ]}
          actions={EntryActions(entry, query!, sortBy!, getHistoryAndFavourites, fetchData, "")}
        />
      );
    } else if (entry.doi) {
      return (
        <List.Item
          key={entry.uid}
          title={{ value: entry.title, tooltip: entry.title }}
          accessories={[
            { icon: Icon.Person, text: entry.authors[0], tooltip: entry.authors.join(", ") },
            { tag: { value: "DOI", color: Color.Red }, tooltip: entry.doi },
            { tag: { value: "PMID", color: Color.Blue }, tooltip: entry.pmid },
            {
              tag: new Date(entry.epubdate ? entry.epubdate : entry.pubdate),
              tooltip: new Date(entry.epubdate ? entry.epubdate : entry.pubdate).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }),
            },
          ]}
          actions={EntryActions(entry, query!, sortBy!, getHistoryAndFavourites, fetchData, "")}
        />
      );
    } else if (entry.url === "<empty>") {
      return (
        <List.Item
          key={entry.uid}
          title={entry.title}
          subtitle={entry.fulljournalname}
          actions={
            <ActionPanel>
              <Action.Open
                icon={Icon.MagnifyingGlass}
                title="Open Search in Browser"
                target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
              />
            </ActionPanel>
          }
        />
      );
    } else if (entry.title) {
      return (
        <List.Item
          key={entry.uid}
          title={{ value: entry.title, tooltip: entry.title }}
          accessories={[
            { icon: Icon.Person, text: entry.authors[0], tooltip: entry.authors.join(", ") },
            { tag: { value: "PMID", color: Color.Blue }, tooltip: entry.pmid },
            {
              tag: new Date(entry.epubdate ? entry.epubdate : entry.pubdate),
              tooltip: new Date(entry.epubdate ? entry.epubdate : entry.pubdate).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }),
            },
          ]}
          actions={EntryActions(entry, query!, sortBy!, getHistoryAndFavourites, fetchData, "")}
        />
      );
    }
  }
}

async function unfavouriteItem(title: string, getHistoryAndFavourites: () => void) {
  const favouritesString = await LocalStorage.getItem(FAVOURITES_KEY);
  if (favouritesString !== undefined) {
    let favouriteItems = JSON.parse(favouritesString as string);
    const currentEntryInFavourites = favouriteItems.find((item: { title: string }) => item.title === title);
    if (currentEntryInFavourites !== undefined) {
      // Delete the entry from the array if it exists
      favouriteItems = favouriteItems.filter((item: { title: string }) => item !== currentEntryInFavourites);
    }
    await LocalStorage.setItem(FAVOURITES_KEY, JSON.stringify(favouriteItems));
    getHistoryAndFavourites();
  }
}

async function reloadArticles(fetchTopArticles: () => void) {
  await LocalStorage.removeItem(LASTRELOAD_KEY);
  fetchTopArticles();
}

async function clearAllHistory(fetchTopArticles: () => void, getHistoryAndFavourites: () => void) {
  await LocalStorage.removeItem(HISTORY_KEY);
  fetchTopArticles();
  getHistoryAndFavourites();
}

async function clearAllFavourites(fetchTopArticles: () => void, getHistoryAndFavourites: () => void) {
  await LocalStorage.removeItem(FAVOURITES_KEY);
  fetchTopArticles();
  getHistoryAndFavourites();
}

function EntryActions(
  article: Article,
  query: string,
  sortBy: string,
  getHistoryAndFavourites: () => void,
  fetchData: () => void,
  options: string
) {
  if (options === "favourite") {
    if (
      preferences.scihubinstance.value != undefined &&
      String(preferences.scihubinstance.value) != "" &&
      article.doi
    ) {
      return (
        <ActionPanel>
          <Action.Push
            icon={Icon.Book}
            title="Read Abstract"
            target={<Details article={article} query={query} onDetailViewPop={getHistoryAndFavourites} />}
            shortcut={{ modifiers: [], key: "arrowRight" }}
          />
          <Action
            icon={Icon.StarDisabled}
            title={"Unfavourite"}
            onAction={() => unfavouriteItem(article.title, getHistoryAndFavourites)}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.Open
            icon={Icon.Globe}
            title="Open Article in Browser"
            target={article.url}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.Open
            icon={Icon.MagnifyingGlass}
            title="Open Search in Browser"
            target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action.Open
            icon={Icon.LockUnlocked}
            title="Open Article on Sci-Hub in Browser"
            target={preferences.scihubinstance.value + encodeURI(article.doi)}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
          <Action.CopyToClipboard
            title="Copy PMID"
            content={article.pmid}
            shortcut={{ modifiers: ["shift"], key: "p" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
          <Action
            icon={Icon.ArrowClockwise}
            title={"Reload Trending Articles"}
            onAction={() => reloadArticles(fetchData)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All History"}
            onAction={() => clearAllHistory(fetchData, getHistoryAndFavourites)}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All Favourites"}
            onAction={() => clearAllFavourites(fetchData, getHistoryAndFavourites)}
          />
        </ActionPanel>
      );
    } else if (article.doi) {
      return (
        <ActionPanel>
          <Action.Push
            icon={Icon.Book}
            title="Read Abstract"
            target={<Details article={article} query={query} onDetailViewPop={getHistoryAndFavourites} />}
            shortcut={{ modifiers: [], key: "arrowRight" }}
          />
          <Action
            icon={Icon.StarDisabled}
            title={"Unfavourite"}
            onAction={() => unfavouriteItem(article.title, getHistoryAndFavourites)}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.Open
            icon={Icon.Globe}
            title="Open Article in Browser"
            target={article.url}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.Open
            icon={Icon.MagnifyingGlass}
            title="Open Search in Browser"
            target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
          <Action.CopyToClipboard
            title="Copy PMID"
            content={article.pmid}
            shortcut={{ modifiers: ["shift"], key: "p" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
          <Action
            icon={Icon.ArrowClockwise}
            title={"Reload Trending Articles"}
            onAction={() => reloadArticles(fetchData)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All History"}
            onAction={() => clearAllHistory(fetchData, getHistoryAndFavourites)}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All Favourites"}
            onAction={() => clearAllFavourites(fetchData, getHistoryAndFavourites)}
          />
        </ActionPanel>
      );
    } else {
      return (
        <ActionPanel>
          <Action.Push
            icon={Icon.Book}
            title="Read Abstract"
            target={<Details article={article} query={query} onDetailViewPop={getHistoryAndFavourites} />}
            shortcut={{ modifiers: [], key: "arrowRight" }}
          />
          <Action
            icon={Icon.StarDisabled}
            title={"Unfavourite"}
            onAction={() => unfavouriteItem(article.title, getHistoryAndFavourites)}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.Open
            icon={Icon.Globe}
            title="Open Article in Browser"
            target={article.url}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.Open
            icon={Icon.MagnifyingGlass}
            title="Open Search in Browser"
            target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action.CopyToClipboard
            title="Copy PMID"
            content={article.pmid}
            shortcut={{ modifiers: ["shift"], key: "p" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
          <Action
            icon={Icon.ArrowClockwise}
            title={"Reload Trending Articles"}
            onAction={() => reloadArticles(fetchData)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All History"}
            onAction={() => clearAllHistory(fetchData, getHistoryAndFavourites)}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All Favourites"}
            onAction={() => clearAllFavourites(fetchData, getHistoryAndFavourites)}
          />
        </ActionPanel>
      );
    }
  } else if (preferences.scihubinstance.value != undefined && preferences.scihubinstance.value != "" && article.doi) {
    if (query) {
      return (
        <ActionPanel>
          <Action.Push
            icon={Icon.Book}
            title="Read Abstract"
            target={<Details article={article} query={query} onDetailViewPop={getHistoryAndFavourites} />}
            // shortcut={{ modifiers: [], key: "arrowRight" }}
          />
          <Action.Open
            icon={Icon.Globe}
            title="Open Article in Browser"
            target={article.url}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.Open
            icon={Icon.MagnifyingGlass}
            title="Open Search in Browser"
            target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action.Open
            icon={Icon.LockUnlocked}
            title="Open Article on Sci-Hub in Browser"
            target={preferences.scihubinstance.value + encodeURI(article.doi)}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
          <Action.CopyToClipboard
            title="Copy PMID"
            content={article.pmid}
            shortcut={{ modifiers: ["shift"], key: "p" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
          <Action
            icon={Icon.ArrowClockwise}
            title={"Reload Trending Articles"}
            onAction={() => reloadArticles(fetchData)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All History"}
            onAction={() => clearAllHistory(fetchData, getHistoryAndFavourites)}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All Favourites"}
            onAction={() => clearAllFavourites(fetchData, getHistoryAndFavourites)}
          />
        </ActionPanel>
      );
    } else {
      return (
        <ActionPanel>
          <Action.Push
            icon={Icon.Book}
            title="Read Abstract"
            target={<Details article={article} query={query} onDetailViewPop={getHistoryAndFavourites} />}
            shortcut={{ modifiers: [], key: "arrowRight" }}
          />
          <Action.Open
            icon={Icon.Globe}
            title="Open Article in Browser"
            target={article.url}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.Open
            icon={Icon.MagnifyingGlass}
            title="Open Search in Browser"
            target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action.Open
            icon={Icon.LockUnlocked}
            title="Open Article on Sci-Hub in Browser"
            target={preferences.scihubinstance.value + encodeURI(article.doi)}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
          <Action.CopyToClipboard
            title="Copy PMID"
            content={article.pmid}
            shortcut={{ modifiers: ["shift"], key: "p" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
          <Action
            icon={Icon.ArrowClockwise}
            title={"Reload Trending Articles"}
            onAction={() => reloadArticles(fetchData)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All History"}
            onAction={() => clearAllHistory(fetchData, getHistoryAndFavourites)}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All Favourites"}
            onAction={() => clearAllFavourites(fetchData, getHistoryAndFavourites)}
          />
        </ActionPanel>
      );
    }
  } else if (article.doi) {
    if (query) {
      return (
        <ActionPanel>
          <Action.Push
            icon={Icon.Book}
            title="Read Abstract"
            target={<Details article={article} query={query} onDetailViewPop={getHistoryAndFavourites} />}
            // shortcut={{ modifiers: [], key: "arrowRight" }}
          />
          <Action.Open
            icon={Icon.Globe}
            title="Open Article in Browser"
            target={article.url}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.Open
            icon={Icon.MagnifyingGlass}
            title="Open Search in Browser"
            target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
          <Action.CopyToClipboard
            title="Copy PMID"
            content={article.pmid}
            shortcut={{ modifiers: ["shift"], key: "p" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
          <Action
            icon={Icon.ArrowClockwise}
            title={"Reload Trending Articles"}
            onAction={() => reloadArticles(fetchData)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All History"}
            onAction={() => clearAllHistory(fetchData, getHistoryAndFavourites)}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All Favourites"}
            onAction={() => clearAllFavourites(fetchData, getHistoryAndFavourites)}
          />
        </ActionPanel>
      );
    } else {
      return (
        <ActionPanel>
          <Action.Push
            icon={Icon.Book}
            title="Read Abstract"
            target={<Details article={article} query={query} onDetailViewPop={getHistoryAndFavourites} />}
            shortcut={{ modifiers: [], key: "arrowRight" }}
          />
          <Action.Open
            icon={Icon.Globe}
            title="Open Article in Browser"
            target={article.url}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.Open
            icon={Icon.MagnifyingGlass}
            title="Open Search in Browser"
            target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
          <Action.CopyToClipboard
            title="Copy PMID"
            content={article.pmid}
            shortcut={{ modifiers: ["shift"], key: "p" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
          <Action
            icon={Icon.ArrowClockwise}
            title={"Reload Trending Articles"}
            onAction={() => reloadArticles(fetchData)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All History"}
            onAction={() => clearAllHistory(fetchData, getHistoryAndFavourites)}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All Favourites"}
            onAction={() => clearAllFavourites(fetchData, getHistoryAndFavourites)}
          />
        </ActionPanel>
      );
    }
  } else if (query) {
    return (
      <ActionPanel>
        <Action.Push
          icon={Icon.Book}
          title="Read Abstract"
          target={<Details article={article} query={query} onDetailViewPop={getHistoryAndFavourites} />}
          // shortcut={{ modifiers: [], key: "arrowRight" }}
        />
        <Action.Open
          icon={Icon.Globe}
          title="Open Article in Browser"
          target={article.url}
          shortcut={{ modifiers: ["shift"], key: "enter" }}
        />
        <Action.Open
          icon={Icon.MagnifyingGlass}
          title="Open Search in Browser"
          target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
        <Action.CopyToClipboard
          title="Copy PMID"
          content={article.pmid}
          shortcut={{ modifiers: ["shift"], key: "p" }}
        />
        <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
        <Action
          icon={Icon.ArrowClockwise}
          title={"Reload Trending Articles"}
          onAction={() => reloadArticles(fetchData)}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <Action
          icon={Icon.Trash}
          title={"Clear All History"}
          onAction={() => clearAllHistory(fetchData, getHistoryAndFavourites)}
        />
        <Action
          icon={Icon.Trash}
          title={"Clear All Favourites"}
          onAction={() => clearAllFavourites(fetchData, getHistoryAndFavourites)}
        />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel>
        <Action.Push
          icon={Icon.Book}
          title="Read Abstract"
          target={<Details article={article} query={query} onDetailViewPop={getHistoryAndFavourites} />}
          shortcut={{ modifiers: [], key: "arrowRight" }}
        />
        <Action.Open
          icon={Icon.Globe}
          title="Open Article in Browser"
          target={article.url}
          shortcut={{ modifiers: ["shift"], key: "enter" }}
        />
        <Action.Open
          icon={Icon.MagnifyingGlass}
          title="Open Search in Browser"
          target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
        <Action.CopyToClipboard
          title="Copy PMID"
          content={article.pmid}
          shortcut={{ modifiers: ["shift"], key: "p" }}
        />
        <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
        <Action
          icon={Icon.ArrowClockwise}
          title={"Reload Trending Articles"}
          onAction={() => reloadArticles(fetchData)}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <Action
          icon={Icon.Trash}
          title={"Clear All History"}
          onAction={() => clearAllHistory(fetchData, getHistoryAndFavourites)}
        />
        <Action
          icon={Icon.Trash}
          title={"Clear All Favourites"}
          onAction={() => clearAllFavourites(fetchData, getHistoryAndFavourites)}
        />
      </ActionPanel>
    );
  }
}

function EntryActionsDetail(article: Article, query: string) {
  const backTitel = query != undefined && query != "" ? `Back to Search  "` + query + `"` : "Back to Trending Articles";
  const { pop } = useNavigation();
  if (preferences.scihubinstance.value != undefined && preferences.scihubinstance.value != "" && article.doi) {
    return (
      <ActionPanel>
        <Action.Open icon={Icon.Globe} title="Open Article in Browser" target={article.url} />
        <Action.Open
          icon={Icon.LockUnlocked}
          title="Open article on Sci-Hub in Browser"
          target={preferences.scihubinstance.value + encodeURI(article.doi)}
          shortcut={{ modifiers: ["shift"], key: "enter" }}
        />
        <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
        <Action.CopyToClipboard
          title="Copy PMID"
          content={article.pmid}
          shortcut={{ modifiers: ["shift"], key: "p" }}
        />
        <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
        <Action
          icon={Icon.ArrowLeftCircleFilled}
          title={backTitel}
          onAction={pop}
          shortcut={{ modifiers: [], key: "arrowLeft" }}
        />
      </ActionPanel>
    );
  } else if (article.doi) {
    return (
      <ActionPanel>
        <Action.Open icon={Icon.Globe} title="Open Article in Browser" target={article.url} />
        <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
        <Action.CopyToClipboard
          title="Copy PMID"
          content={article.pmid}
          shortcut={{ modifiers: ["shift"], key: "p" }}
        />
        <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
        <Action
          icon={Icon.ArrowLeftCircleFilled}
          title={backTitel}
          onAction={pop}
          shortcut={{ modifiers: [], key: "arrowLeft" }}
        />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel>
        <Action.Open icon={Icon.Globe} title="Open Article in Browser" target={article.url} />
        <Action.CopyToClipboard
          title="Copy PMID"
          content={article.pmid}
          shortcut={{ modifiers: ["shift"], key: "p" }}
        />
        <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
        <Action
          icon={Icon.ArrowLeftCircleFilled}
          title={backTitel}
          onAction={pop}
          shortcut={{ modifiers: [], key: "arrowLeft" }}
        />
      </ActionPanel>
    );
  }
}

const Details = (props: { article: Article; query: string; onDetailViewPop: () => void }) => {
  const { onDetailViewPop } = props;
  const [searchText, setSearchText] = useState("");
  const [favouriteTitle, setFavouriteTitle] = useState<string>("");
  const [navigationTitle, setNavigationTitle] = useState<string>("");
  const { isLoading, data } = useFetch(props.article.url, {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
    initialData: "",
  });

  useEffect(() => {
    checkFavouriteStatus({
      url: props.article.url,
      uid: "",
      title: "",
      authors: [],
      pubdate: "",
      epubdate: "",

      doi: "",
      pmid: "",
      pmc: "",

      fulljournalname: "",
      volume: "",
      issue: "",
      pages: "",
    });
    return () => {
      // This cleanup function will be called when the component unmounts
      onDetailViewPop();
    };
  }, []); // Run only once after initial render

  const $ = cheerio.load(String(data));

  controllToast("Loading article", true);

  const nhm = new NodeHtmlMarkdown(
    /* options (optional) */ {},
    /* customTransformers (optional) */ undefined,
    /* customCodeBlockTranslators (optional) */ undefined
  );

  let abstract = "";
  const loadingAbstractHTML = "<em>Loading abstract…</em>";
  $("#abstract").each(function (i, link) {
    abstract += $(link).html();
  });
  if (abstract === "") {
    abstract = loadingAbstractHTML;
  }

  let copyright = "";
  $("#copyright").each(function (i, link) {
    copyright += $(link).html();
  });

  let conflict = "";
  $("#conflict-of-interest").each(function (i, link) {
    conflict += $(link).html();
  });

  const affiliations = $(".affiliations").length ? $(".affiliations").html() : "";

  $(".figure-caption-link").attr(
    "href",
    "https://www.ncbi.nlm.nih.gov/pmc/articles/" +
      props.article.pmc +
      "/figure/" +
      $(".figure-link").attr("data-figure-id")
  ); // replace the copyright link with the right Link for the first image

  let figures = "";
  $(".caption-wrap").remove();
  $(".figure-caption-medium").remove();
  $("#figures").each(function (i, link) {
    const htmlContent = $(link).html() || ""; // null check and default value
    figures += htmlContent.replace(
      "See this image and copyright information in PMC",
      "See images and copyright information in PMC"
    );
  });

  let markdown = "";
  if (abstract === loadingAbstractHTML && isLoading === false) {
    abstract = "<em>No abstract available</em>";
  }
  markdown = nhm.translate(abstract + copyright + conflict + figures + affiliations);

  const dateTitle =
    props.article.epubdate === props.article.pubdate
      ? "Electronic Publication Date"
      : props.article.epubdate
      ? "(Electronic) Publication Date"
      : "Publication Date";
  const dateText =
    props.article.epubdate === props.article.pubdate
      ? new Date(props.article.epubdate).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : props.article.epubdate
      ? "(" +
        new Date(props.article.epubdate).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }) +
        ") " +
        new Date(props.article.pubdate).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : new Date(props.article.pubdate).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

  const citationTitle = props.article.issue
    ? "Volume(Issue):Pages"
    : props.article.volume
    ? "Volume:Pages"
    : "Not published yet";
  const citationText = props.article.issue
    ? props.article.volume + "(" + props.article.issue + "):" + props.article.pages
    : props.article.volume
    ? props.article.volume + ":" + props.article.pages
    : "Online ahead of print";

  const idsTitle = props.article.pmc && props.article.doi ? "PMC, DOI, PMID" : props.article.doi ? "DOI, PMID" : "PMID";

  if (!isLoading && Number.parseInt(String(preferences.historyItemsNumber.value), 10) > 0) {
    setHistoryItem(props.article);
    controllToast("Loading article", false);
  }

  async function checkFavouriteStatus(value: Article) {
    const thisItem = value;

    const favouritesString = (await LocalStorage.getItem(FAVOURITES_KEY)) as string;
    if (favouritesString != undefined) {
      let favouriteItems = JSON.parse(favouritesString);
      const currentArticleInHistory = favouriteItems.find((o: Article) => o.url === thisItem.url);
      if (currentArticleInHistory !== undefined) {
        // delete old history entry when it already exists
        favouriteItems = favouriteItems.filter((item: Article) => item.url !== currentArticleInHistory.url);
        setFavouriteTitle("Unfavourite");
        setNavigationTitle("★ ");
      } else {
        setFavouriteTitle("Favourite");
        setNavigationTitle("");
      }
    }
  }

  async function setFavouriteItem() {
    const historyString = (await LocalStorage.getItem(HISTORY_KEY)) as string;
    if (isLoading) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to favourite",
        message: "Please wait for the article to load",
      });
    } else if (historyString != undefined) {
      const historyItems = JSON.parse(historyString);
      const thisItem = historyItems[historyItems.length - 1];

      const favouritesString = (await LocalStorage.getItem(FAVOURITES_KEY)) as string;
      if (favouritesString != undefined) {
        let favouriteItems = JSON.parse(favouritesString);

        const currentArticleInHistory = favouriteItems.find((item: any) => item.title === thisItem.title);
        if (currentArticleInHistory != undefined) {
          // delete old history entry when it already exists
          favouriteItems = favouriteItems.filter((item: any) => item !== currentArticleInHistory);
          setFavouriteTitle("Favourite");
          setNavigationTitle("");
        } else {
          // not already a favourite - save it
          favouriteItems.push(thisItem);
          setFavouriteTitle("Unfavourite");
          setNavigationTitle("★ ");
        }
        await LocalStorage.setItem(FAVOURITES_KEY, JSON.stringify(favouriteItems));
      } else {
        const firstitem = [];
        firstitem.push(thisItem);
        await LocalStorage.setItem(FAVOURITES_KEY, JSON.stringify(firstitem));
      }
    }
  }

  checkFavouriteStatus({
    url: props.article.url,
    uid: "",
    title: "",
    authors: [],
    pubdate: "",
    epubdate: "",

    doi: "",
    pmid: "",
    pmc: "",

    fulljournalname: "",
    volume: "",
    issue: "",
    pages: "",
  });

  if (props.article.pmc && props.article.doi) {
    return (
      <Detail
        navigationTitle={navigationTitle + props.article.title}
        isLoading={isLoading}
        markdown={"# " + props.article.title + "\n" + markdown}
        metadata={
          <Detail.Metadata>
            {/* <Detail.Metadata.Label
              title="Publication Type"
              text={$("#publication-types").find(".keyword-actions-trigger").text().trim()}
            /> */}
            <Detail.Metadata.Label title="Authors" text={props.article.authors.join(", ")} />
            <Detail.Metadata.Label title="Journal" text={props.article.fulljournalname} />
            <Detail.Metadata.Label title={dateTitle} text={dateText} />
            <Detail.Metadata.Label title={citationTitle} text={citationText} />
            <Detail.Metadata.TagList title={idsTitle}>
              <Detail.Metadata.TagList.Item text={props.article.pmc} color={Color.Green} />
              <Detail.Metadata.TagList.Item text={props.article.doi} color={Color.Red} />
              <Detail.Metadata.TagList.Item text={props.article.pmid} color={Color.Blue} />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        }
        actions={EntryActionsDetail(props.article, props.query, favouriteTitle)}
      />
    );
  } else if (props.article.doi) {
    return (
      <Detail
        navigationTitle={navigationTitle + props.article.title}
        isLoading={isLoading}
        markdown={"# " + props.article.title + "\n" + markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Authors" text={props.article.authors.join(", ")} />
            <Detail.Metadata.Label title="Journal" text={props.article.fulljournalname} />
            <Detail.Metadata.Label title={dateTitle} text={dateText} />
            <Detail.Metadata.Label title={citationTitle} text={citationText} />
            <Detail.Metadata.TagList title={idsTitle}>
              <Detail.Metadata.TagList.Item text={props.article.doi} color={Color.Red} />
              <Detail.Metadata.TagList.Item text={props.article.pmid} color={Color.Blue} />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        }
        actions={EntryActionsDetail(props.article, props.query, favouriteTitle)}
      />
    );
  } else {
    return (
      <Detail
        navigationTitle={navigationTitle + props.article.title}
        isLoading={isLoading}
        markdown={"# " + props.article.title + "\n" + markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Authors" text={props.article.authors.join(", ")} />
            <Detail.Metadata.Label title="Journal" text={props.article.fulljournalname} />
            <Detail.Metadata.Label title={dateTitle} text={dateText} />
            <Detail.Metadata.Label title={citationTitle} text={citationText} />
            <Detail.Metadata.TagList title={idsTitle}>
              <Detail.Metadata.TagList.Item text={props.article.pmid} color={Color.Blue} />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        }
        actions={EntryActionsDetail(props.article, props.query, favouriteTitle)}
      />
    );
  }

  function EntryActionsDetail(article: Article, query: string, favouriteTitle: string) {
    const favouriteIcon = favouriteTitle === "Favourite" ? Icon.Star : Icon.StarDisabled;
    const backTitel =
      query != undefined && query != "" ? `Back to search  "` + query + `"` : "Back to Trending Articles";
    const { pop } = useNavigation();
    if (preferences.scihubinstance.value != undefined && preferences.scihubinstance.value != "" && article.doi) {
      return (
        <ActionPanel>
          <Action.Open icon={Icon.Globe} title="Open Article in Browser" target={article.url} />
          <Action
            icon={favouriteIcon}
            title={favouriteTitle}
            onAction={setFavouriteItem}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.Open
            icon={Icon.LockUnlocked}
            title="Open Article on Sci-Hub in Browser"
            target={preferences.scihubinstance.value + encodeURI(article.doi)}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
          <Action.CopyToClipboard
            title="Copy PMID"
            content={article.pmid}
            shortcut={{ modifiers: ["shift"], key: "p" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
          <Action
            icon={Icon.ArrowLeftCircleFilled}
            title={backTitel}
            onAction={pop}
            shortcut={{ modifiers: [], key: "arrowLeft" }}
          />
        </ActionPanel>
      );
    } else if (article.doi) {
      return (
        <ActionPanel>
          <Action.Open icon={Icon.Globe} title="Open Article in Browser" target={article.url} />
          <Action
            icon={favouriteIcon}
            title={favouriteTitle}
            onAction={setFavouriteItem}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
          <Action.CopyToClipboard
            title="Copy PMID"
            content={article.pmid}
            shortcut={{ modifiers: ["shift"], key: "p" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
          <Action
            icon={Icon.ArrowLeftCircleFilled}
            title={backTitel}
            onAction={pop}
            shortcut={{ modifiers: [], key: "arrowLeft" }}
          />
        </ActionPanel>
      );
    } else {
      return (
        <ActionPanel>
          <Action.Open icon={Icon.Globe} title="Open Article in Browser" target={article.url} />
          <Action
            icon={favouriteIcon}
            title={favouriteTitle}
            onAction={setFavouriteItem}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.CopyToClipboard
            title="Copy PMID"
            content={article.pmid}
            shortcut={{ modifiers: ["shift"], key: "p" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
          <Action
            icon={Icon.ArrowLeftCircleFilled}
            title={backTitel}
            onAction={pop}
            shortcut={{ modifiers: [], key: "arrowLeft" }}
          />
        </ActionPanel>
      );
    }
  }
};

async function controllToast(title: string, loading: boolean) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: title,
  });
  if (!loading) {
    toast.hide();
  }
}

async function setHistoryItem(value: Article) {
  const historyString = (await LocalStorage.getItem(HISTORY_KEY)) as string;
  if (historyString != undefined) {
    let historyItems = JSON.parse(historyString);

    const currentArticleInHistory = historyItems.find((o: Article) => o.title === value.title);
    if (currentArticleInHistory != undefined) {
      // delete old history entry when it already exists
      historyItems = historyItems.filter((item: Article) => item !== currentArticleInHistory);
    }
    historyItems.push(value);

    if (historyItems.length > preferences.historyItemsNumber) {
      historyItems.shift();
    }

    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(historyItems));
  } else {
    const firstitem = [];
    firstitem.push(value);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(firstitem));
  }
}
