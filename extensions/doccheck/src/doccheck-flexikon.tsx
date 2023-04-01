import { Icon, Color, Detail, List, showToast, Toast, Action, ActionPanel } from "@raycast/api";
import axios from "axios";
import cheerio from "cheerio";
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import { NodeHtmlMarkdown } from "node-html-markdown";

export default function Command() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Result[]>([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetch() {
      if (!query) {
        setState([]);
        await axios
          .get("https://flexikon.doccheck.com/de/")
          .then((response) => {
            const $ = cheerio.load(response.data);
            const topArticles = [];

            $("#topArticlesSection .row > a, #topArticlesSection .is-grid > a").each((i, el) => {
              const title = $(el).find("h3").text().trim();
              const url = $(el).attr("href");
              const imageUrl = $(el).find("img").attr("src").replace(" ", "");
              const description = $(el).find("p").text().trim();
              const title_alias = [];
              topArticles.push({ title, url, imageUrl, description, title_alias });
            });

            setEntries(topArticles);
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
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
        <List.Section title={!query ? "Top Artikel" : "Results"} subtitle={""}>
          {entries.map((entry) => {
            if (entry.description) {
              return (
                <List.Item
                  key={entry.url}
                  title={entry.title}
                  icon={entry.imageUrl}
                  subtitle={entry.description}
                  actions={EntryActions(entry.url, entry.title, query)}
                />
              );
            } else if (entry.imageUrl) {
              return (
                <List.Item
                  key={entry.url}
                  title={entry.title}
                  icon={entry.imageUrl}
                  subtitle={entry.url}
                  actions={EntryActions(entry.url, entry.title, query)}
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
                      target={"https://next.amboss.com/de/search?q=" + encodeURI(entry.query) + "&v=overview"}
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
                  { tag: { value: entry.title_alias[0], color: Color.Red }, tooltip: "Tag with tooltip" },
                  { tag: { value: entry.title_alias[1], color: Color.Red }, tooltip: "Tag with tooltip" },
                  { tag: { value: entry.title_alias[2], color: Color.Red }, tooltip: "Tag with tooltip" },
                  { icon: Icon.Person, text: entry.author },
                  { tag: new Date(entry.date_publish) },
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
                  { tag: { value: entry.title_alias[0], color: Color.Red }, tooltip: "Tag with tooltip" },
                  { tag: { value: entry.title_alias[1], color: Color.Red }, tooltip: "Tag with tooltip" },
                  { icon: Icon.Person, text: entry.author },
                  { tag: new Date(entry.date_publish) },
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
                  { tag: { value: entry.title_alias[0], color: Color.Red }, tooltip: "Tag with tooltip" },
                  { icon: Icon.Person, text: entry.author },
                  { tag: new Date(entry.date_publish) },
                ]}
                actions={EntryActions(entry.url, entry.title, query)}
              />
            );
          } else if (entry.title) {
            return (
              <List.Item
                key={entry.url}
                title={entry.title}
                accessories={[{ icon: Icon.Person, text: entry.author }, { tag: new Date(entry.date_publish) }]}
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
      <Action.Push icon={Icon.Book} title="Eintrag lesen" target={<Details url={url} title={title} />} />
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

// 			<Action.Push
// 				icon={Icon.Document}
// 				title="Read Document"
// 				target={<Details url={url} />}
// 			/>

const Details = (props: { url: string; title: string }) => {
  let website = "";
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch(props.url, {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
    initialData: "",
  });

  website = cheerio.load(data);

  const relateArticle = website(".collapsible-article").map((i, section) => {
    const articles = website(section).find(".collapsible-content");
    return articles.html();
  });

  // Synonyme
  let mdSynonyms = "";
  let synonyms = "";
  website(".mw-parser-output")
    .find("i")
    .each(function (i, link) {
      synonyms += website(link).html() + "\n";
    });

  // erster <i></i> im Artikel - zum Abgleich ob es Synonyme gibt oder nicht
  let notSynonyms = "";
  website(".collapsible")
    .find("i")
    .each(function (i, link) {
      notSynonyms += website(link).html() + "\n";
    });
  // 	notSynonyms = notSynonyms.trim();
  synonyms = synonyms.replace(notSynonyms, "");

  // SYNONYME
  if (synonyms) {
    // es gibt Synonyme oder Erklärungen unter der Überschrift
    mdSynonyms =
      "```\n" +
      synonyms
        .trim()
        .split("<br>")
        .join("")
        .split("</b>\n")
        .join(" ")
        .split("<b>")
        .join("")
        .split("</b>")
        .join("")
        .split("<sup>")
        .join("")
        .split("</sup>")
        .join("") +
      "\n" +
      "``` " +
      "\n";
  }

  const nhm = new NodeHtmlMarkdown(
    /* options (optional) */ {},
    /* customTransformers (optional) */ undefined,
    /* customCodeBlockTranslators (optional) */ undefined
  );
  let html = "";
  website(".mw-parser-output").each(function (i, link) {
    html += website(link).html();
  });
  let toc = "";
  website("#toc").each(function (i, link) {
    toc += website(link).html();
  });

  // remove synonyms
  let markdown = "";
  synonyms.split("\n").forEach((element) => {
    html = html.replace(element, "");
  });
  markdown = "";
  markdown =
    "\# " +
    props.title +
    "\n" +
    mdSynonyms +
    nhm
      .translate(html.replace(toc, "").replace(/\#cite_\D*\d*/gm, '"'))
      .replace(/]\(\//gm, "](https://flexikon.doccheck.com/"); // ÜBERSCHRIFT + ```SYNONYME``` -TOC + ARTIKEL (Entfernung von Akern, relative zu absoluten Links)

  return (
    <Detail
      navigationTitle={`DocCheck - ${props.title}`}
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Open
            icon={Icon.Globe}
            title="Eintrag im Browser öffnen"
            target={props.url}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <Action.Open
            icon={Icon.Uppercase}
            title="Eintrag als AMBOSS-Suche"
            target={"https://next.amboss.com/de/search?q=" + encodeURI(props.title) + "&v=overview"}
            shortcut={{ modifiers: ["opt"], key: "enter" }}
          />
        </ActionPanel>
      }
    />
  );
};
