import { Action, ActionPanel, Detail, getPreferenceValues, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import Style = Toast.Style;
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import cheerio from "cheerio";
import { NodeHtmlMarkdown } from "node-html-markdown";

const preferences = getPreferenceValues();

export default function DocCheckPage(props: { prevtitle: string; prevurl: string; title: string; url: string }) {
  const [searchText, setSearchText] = useState("");
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
  let html = "";
  $(".mw-parser-output").each(function (i, link) {
    html += props.title === "Medizinische Abkürzungen" ? "<br><em>Dieser Artikel enthält eine zu lange Tabelle und kann in Raycast nicht angezeigt werden</em>" : $(link).html();
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

  markdown = "";
  const goback =
    props.prevurl != undefined && props.prevurl != "" && preferences.openIn != "browser"
      ? "[← " +
        props.prevtitle +
        "](" +
        "raycast://extensions/spacedog/doccheck/open-page?arguments=" +
        encodeURI(JSON.stringify({ title: props.prevtitle, url: props.prevurl })) +
        ")"
      : "[← Suche](" + "raycast://extensions/spacedog/doccheck/doccheck-flexikon)";
  markdown +=
    "# " +
    props.title +
    "\n" +
    goback +
    "\n" +
    mdSynonyms +
    nhm.translate(html.replace(toc, "").replace(/#cite_\D*\d*/gm, '"')); // ÜBERSCHRIFT + ```SYNONYME``` -TOC + ARTIKEL (Entfernung von Akern, relative zu absoluten Links)

  return (
    <Detail
      navigationTitle={props.title}
      isLoading={isLoading}
      markdown={
        preferences.openIn === "browser"
          ? markdown.replace(/]\(\//gm, "](https://flexikon.doccheck.com/")
          : markdown.replace(/\[(.*?)\]\((\/.*?) "(.*?)"\)/g, function (match, p1, p2, p3) {
              const url = "https://flexikon.doccheck.com" + p2;
              const args = {
                prevtitle: props.title,
                prevurl: props.url,
                title: p3,
                url: url,
              };
              // console.log(args)
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
            title="Eintrag als AMBOSS-Suche"
            target={"https://next.amboss.com/de/search?q=" + encodeURI(props.title) + "&v=overview"}
            shortcut={{ modifiers: ["opt"], key: "enter" }}
          />
        </ActionPanel>
      }
    />
  );
}
