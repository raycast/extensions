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

  // first <i></i> in the article - to check if there are synonyms or not
  let notSynonyms = "";
  $(".collapsible")
    .find("i")
    .each(function (i, link) {
      notSynonyms += $(link).html() + "\n";
    });
  // 	notSynonyms = notSynonyms.trim();
  synonyms = synonyms.replace(notSynonyms, "");

  if (synonyms) {
    // there are synonyms or explanations under the heading
    mdSynonyms =
      "```\n" +
      synonyms
        .trim()
        .replace(/<br>/gm, ``)
        .replace(/<\/b>\n/gm, ` `)
        .replace(/<b>/gm, ``)
        .replace(/<\/b>/gm, ``)
        .replace(/<sub>/gm, ``)
        .replace(/<\/sub>/gm, ``)
        .replace(/<sup>/gm, ``)
        .replace(/<\/sup>/gm, ``)
        .replace(/<a .*">/gm, ``)
        .replace(/<\/a>/gm, ``) +
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

  // table of contents
  const toc = $("#toc").html();

  // "Articulus brevis minimus"
  const abm = $(".has-bg-gray-200").html();

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
        ")\n"
      : props.query != "" && preferences.openIn != "browser"
      ? "[← Search" +
        queryText +
        "](" +
        "raycast://extensions/spacedog/doccheck/doccheck-flexikon?fallbackText=" +
        encodeURI(query) +
        ")\n"
      : preferences.openIn != "browser"
      ? "[← Top Articles](raycast://extensions/spacedog/doccheck/doccheck-flexikon)\n"
      : "";
  markdown +=
    "\n " +
    goback +
    mdSynonyms +
    nhm
      .translate(
        html
          .replace(toc ?? "", "")
          .replace(abm ?? "", "")
          .replace(/#cite_\D*\d*/gm, '"')
          .replace(`th>&nbsp;</th`, `th>.</th`)
          .replace(`tr>\n<th></th>`, `tr>\n<th>.</th>`)
          .replace(`<td></td>`, `<td> </td>`)
          .replace(/<iframe.*src="(.*youtu.*)" frame.*><\/iframe>/gm, `YouTube Video: <a href="$1">$1</a>`)
          .replace(/<iframe.*src="(.*trinket.*)" frame.*><\/iframe>/gm, `trinket Code: <a href="$1">$1</a>`)
          .replace(/ colspan="2"/gm, `>.</th><th`)
      )
      .replace(/\s{94}\|\n/gm, `\n`); // HEADING + ``SYNONYMS`` -TOC + ARTICLE (removal of anchors, relative to absolute links, putting a dot in the empty start line when calculating "Relatives Risiko" and "Odds Ratio" for correct display, removal of some table ends like DDx in "Scharlach")

  if (query) {
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
              title="Open Article in Browser"
              target={props.url}
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
              title={`AMBOSS Search "` + urlTitle + `"`}
              target={"https://next.amboss.com/de/search?q=" + encodeURI(urlTitle) + "&v=overview"}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
            <Action.Open
              icon={Icon.Uppercase}
              title={`AMBOSS Search "` + query + `"`}
              target={"https://next.amboss.com/de/search?q=" + encodeURI(query) + "&v=overview"}
              shortcut={{ modifiers: ["opt", "shift"], key: "enter" }}
            />
          </ActionPanel>
        }
      />
    );
  } else {
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
              title="Open Article in Browser"
              target={props.url}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            <Action.Open
              icon={Icon.Uppercase}
              title={`AMBOSS Search "` + urlTitle + `"`}
              target={"https://next.amboss.com/de/search?q=" + encodeURI(urlTitle) + "&v=overview"}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
          </ActionPanel>
        }
      />
    );
  }
}
