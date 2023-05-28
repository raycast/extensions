import { Icon, Color, ActionPanel, Detail, List, Action, showToast, Toast, preferences, Clipboard } from "@raycast/api";
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

export default function Command() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Article[]>([]);
  const [entries, setEntries] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>();
  const [count, setCount] = useState<string>();

  useEffect(() => {
    async function fetchData() {
      const apikeyArgument = preferences.apikey.value === "0" ? "" : `&api_key=${preferences.apikey.value}`;
      if (!query) {
        try {
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
            throw new Error(`Error fetching search data: ${trendinghResponse.status}`);
          }
        } catch (error) {
          console.error(error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch entries",
            message: (error as Error).message,
          });
          setLoading(false);
        }
      } else {
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
        }
      }
    }

    fetchData();
  }, [query, sortBy]);

  return (
    <List
      navigationTitle={`PubMe Search`}
      filtering={false}
      onSearchTextChange={(text) => {
        setQuery(text);
      }}
      throttle={true}
      isLoading={loading}
      searchBarPlaceholder="Search entry..."
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
      <List.Section
        title={query ? "Results" : "Trending"}
        subtitle={query && count ? count.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""}
      >
        {entries.map((entry) => {
          if (entry.pmc && entry.doi) {
            return (
              <List.Item
                key={entry.uid}
                title={{ value: entry.title, tooltip: entry.title }}
                // icon={entry.title}
                accessories={[
                  // { tag: { value: entry.title_alias[0], color: Color.Red }, tooltip: "Tag with tooltip" },
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
                actions={EntryActions(entry, query!, sortBy!)}
              />
            );
          } else if (entry.doi) {
            return (
              <List.Item
                key={entry.uid}
                title={{ value: entry.title, tooltip: entry.title }}
                // icon={entry.title}
                accessories={[
                  // { tag: { value: entry.title_alias[0], color: Color.Red }, tooltip: "Tag with tooltip" },
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
                actions={EntryActions(entry, query!, sortBy!)}
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
                      title="Open search in Browser"
                      target={
                        "https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)
                      }
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
                // icon={entry.title}
                accessories={[
                  // { tag: { value: entry.title_alias[0], color: Color.Red }, tooltip: "Tag with tooltip" },
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
                actions={EntryActions(entry, query!, sortBy!)}
              />
            );
          }
        })}
      </List.Section>
    </List>
  );
}

function EntryActions(article: Article, query: string, sortBy: string) {
  if (preferences.scihubinstance.value != undefined && preferences.scihubinstance.value != "" && article.doi) {
    return (
      <ActionPanel>
        <Action.Push icon={Icon.Book} title="Read abstract" target={<Details article={article} query={query} />} />
        <Action.Open
          icon={Icon.Globe}
          title="Open Article in Browser"
          target={article.url}
          shortcut={{ modifiers: ["cmd"], key: "enter" }}
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
          shortcut={{ modifiers: ["opt"], key: "enter" }}
        />
        <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
      </ActionPanel>
    );
  } else if (article.doi) {
    return (
      <ActionPanel>
        <Action.Push icon={Icon.Book} title="Read Abstract" target={<Details article={article} query={query} />} />
        <Action.Open
          icon={Icon.Globe}
          title="Open Article in Browser"
          target={article.url}
          shortcut={{ modifiers: ["cmd"], key: "enter" }}
        />
        <Action.Open
          icon={Icon.MagnifyingGlass}
          title="Open Search in Browser"
          target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
        <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel>
        <Action.Push icon={Icon.Book} title="Read abstract" target={<Details article={article} query={query} />} />
        <Action.Open
          icon={Icon.Globe}
          title="Open Article in Browser"
          target={article.url}
          shortcut={{ modifiers: ["cmd"], key: "enter" }}
        />
        <Action.Open
          icon={Icon.MagnifyingGlass}
          title="Open search in Browser"
          target={"https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURI(query!) + "&sort=" + encodeURI(sortBy!)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
      </ActionPanel>
    );
  }
}

function EntryActionsDetail(article: Article) {
  if (preferences.scihubinstance.value != undefined && preferences.scihubinstance.value != "" && article.doi) {
    return (
      <ActionPanel>
        <Action.Open icon={Icon.Globe} title="Open Article in Browser" target={article.url} />
        <Action.Open
          icon={Icon.LockUnlocked}
          title="Open Article on Sci-Hub in Browser"
          target={preferences.scihubinstance.value + encodeURI(article.doi)}
          shortcut={{ modifiers: ["opt"], key: "enter" }}
        />
        <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
      </ActionPanel>
    );
  } else if (article.doi) {
    return (
      <ActionPanel>
        <Action.Open icon={Icon.Globe} title="Open Article in Browser" target={article.url} />
        <Action.CopyToClipboard title="Copy DOI" content={article.doi} shortcut={{ modifiers: ["cmd"], key: "d" }} />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel>
        <Action.Open icon={Icon.Globe} title="Open Article in Browser" target={article.url} />
      </ActionPanel>
    );
  }
}

const Details = (props: { article: Article; query: string }) => {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch(props.article.url, {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
    initialData: "",
  });

  const $ = cheerio.load(String(data));

  const nhm = new NodeHtmlMarkdown(
    /* options (optional) */ {},
    /* customTransformers (optional) */ undefined,
    /* customCodeBlockTranslators (optional) */ undefined
  );

  let abstract = "";
  $("#abstract").each(function (i, link) {
    abstract += $(link).html();
  });
  if (abstract === "") {
    abstract = "<i>No abstract available</i>";
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
  if (isLoading === false) {
    markdown = nhm.translate(abstract + copyright + conflict + figures + affiliations);
  } else {
    markdown = nhm.translate("<em>Loading abstract…</em>");
  }

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

  if (props.article.pmc && props.article.doi) {
    return (
      <Detail
        navigationTitle={props.article.title}
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
        actions={EntryActionsDetail(props.article)}
      />
    );
  } else if (props.article.doi) {
    return (
      <Detail
        navigationTitle={props.article.title}
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
        actions={EntryActionsDetail(props.article)}
      />
    );
  } else {
    return (
      <Detail
        navigationTitle={props.article.title}
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
        actions={EntryActionsDetail(props.article)}
      />
    );
  }
};
