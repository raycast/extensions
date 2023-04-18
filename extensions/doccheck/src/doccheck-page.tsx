import { Action, ActionPanel, Detail, getPreferenceValues, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import cheerio from "cheerio";
import { NodeHtmlMarkdown } from "node-html-markdown";

const preferences = getPreferenceValues();

export default function DocCheckPage(props: { url: string; prevurl: string; query: string }) {
  const prevtitle = decodeURI(props.prevurl?.split("/")?.pop() ?? "").replace(/_/gm, " ");
  const urlTitle = decodeURI(props.url?.split("/")?.pop() ?? "")
    .replace(/_/gm, " ")
    .replace(/.*\?title=(.*?)&.*/gm, `$1: Hier fehlt dein Wissen! Schreib diesen Artikel...`);

  const { isLoading, data } = useFetch(props.url, {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
    initialData: "",
  });

  const $ = cheerio.load(String(data));

  // Synonyme
  let mdSynonyms = "";
  let synonyms = "";
  $(".mw-parser-output")
    .find("i")
    .each(function (i, link) {
      synonyms += $(link).html() + "\n";
    });

  // erster <i></i> im Artikel - zum Abgleich ob es Synonyme gibt oder nicht
  let notSynonyms = "";
  $(".collapsible")
    .find("i")
    .each(function (i, link) {
      notSynonyms += $(link).html() + "\n";
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
        .split("<sub>")
        .join("")
        .split("</sub>")
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

  const title = $(".mw-page-title-main").html() != undefined ? $(".mw-page-title-main").html() : urlTitle ?? "";

  let html = isLoading ? "<br><em>Artikel wird geladen…</em>" : "";
  $(".mw-parser-output").each(function (i, link) {
    html +=
      title === "Medizinische Abkürzungen"
        ? "<br><em>Dieser Artikel enthält eine zu lange Tabelle und kann in Raycast nicht angezeigt werden</em>"
        : $(link).html();
  });

  let toc = "";
  $("#toc").each(function (i, link) {
    toc += $(link).html();
  });

  // remove synonyms
  let markdown = "";
  synonyms.split("\n").forEach((element) => {
    html = html.replace(element, "");
  });

  const query = props.query ? props.query : "";
  const queryText = props.query ? ` "` + props.query + `"` : "";
  markdown = title ? "# " + title : "# " + urlTitle;
  const goback =
    props.prevurl != undefined && props.prevurl != "" && preferences.openIn != "browser"
      ? "[← " +
        prevtitle +
        "](" +
        "raycast://extensions/spacedog/doccheck/open-page?arguments=" +
        encodeURI(JSON.stringify({ url: props.prevurl, query: props.query })) +
        ")"
      : "[← Suche" +
        queryText +
        "](" +
        "raycast://extensions/spacedog/doccheck/doccheck-flexikon?fallbackText=" +
        encodeURI(query) +
        ")";
  markdown +=
    "\n" +
    goback +
    "\n" +
    mdSynonyms +
    nhm.translate(html.replace(toc, "").replace(/#cite_\D*\d*/gm, '"')).replace(/\s{94}\|\n/gm, `\n`); // ÜBERSCHRIFT + ```SYNONYME``` -TOC + ARTIKEL (Entfernung von Ankern, relative zu absoluten Links, Entfernung einiger Tabellenenden wie bei DDx in "Scharlach")

  return (
    <Detail
      navigationTitle={urlTitle}
      isLoading={isLoading}
      markdown={
        preferences.openIn === "browser"
          ? markdown.replace(/]\(\//gm, "](https://flexikon.doccheck.com/")
          : markdown.replace(/\[(.*?)\]\((\/.*?) "(.*?)"\)/g, function (match, p1, p2, p3) {
              const url = "https://flexikon.doccheck.com" + p2;
              const args = {
                url: url,
                prevurl: props.url,
                query: props.query,
              };
              const query = encodeURIComponent(JSON.stringify(args));
              return "[" + p1 + "](raycast://extensions/spacedog/doccheck/open-page?arguments=" + query + ")";
            })
      }
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
            title="Eintragtitel als AMBOSS-Suche"
            target={"https://next.amboss.com/de/search?q=" + encodeURI(urlTitle) + "&v=overview"}
            shortcut={{ modifiers: ["opt"], key: "enter" }}
          />
        </ActionPanel>
      }
    />
  );
}
