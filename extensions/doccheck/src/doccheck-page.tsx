import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  LocalStorage,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import cheerio from "cheerio";
import { useEffect, useState } from "react";
import { NodeHtmlMarkdown } from "node-html-markdown";

type HistoryItem = {
  title: string;
  url: string;
  imageUrl: string;
  description: string;
  date_publish: string;
  author: string;
};

const HISTORY_KEY = "history";
const FAVOURITES_KEY = "favourites";
const preferences = getPreferenceValues();

type DocCheckPageProps = {
  url: string;
  navigationItems: string;
  query: string;
  onDetailViewPop: () => void; // Add this line
};

export default function DocCheckPage(props: DocCheckPageProps) {
  const { url, navigationItems, onDetailViewPop } = props;
  const [favouriteTitle, setFavouriteTitle] = useState<string>("");
  const [navigationTitle, setNavigationTitle] = useState<string>("");
  const [isFavourite, setIsFavourite] = useState(false);
  //const navigationItems: string[] = [];
  let backHistory: string[] = [];
  let forwardHistory: string[] = [];
  let prevurl = "";
  let nexturl = "";

  const cleanURL = props.url.replace("&action=edit&redlink=1", "");

  useEffect(() => {
    checkFavouriteStatus({
      title: "",
      url: props.url,
      description: "",
      imageUrl: "",
      date_publish: "",
      author: "",
    });
    return () => {
      // This cleanup function will be called when the component unmounts
      onDetailViewPop();
    };
  }, []); // Run only once after initial render

  if (props.navigationItems != undefined && props.navigationItems.length === 0) {
    // first item
    backHistory.push(cleanURL);
  } else if (props.navigationItems != undefined) {
    forwardHistory = JSON.parse(props.navigationItems).forward;
    nexturl = forwardHistory[forwardHistory.length - 1];
    forwardHistory.push(cleanURL);
    backHistory = JSON.parse(props.navigationItems).back;
    prevurl = backHistory[backHistory.length - 1];
    backHistory.push(cleanURL);
  }
  const prevtitle = decodeURI(prevurl?.split("/")?.pop() ?? "").replace(/_/gm, " ");
  const nexttitle = decodeURI(nexturl?.split("/")?.pop() ?? "").replace(/_/gm, " ");
  const urlTitle = decodeURI(props.url?.split("/")?.pop() ?? "")
    .replace(/_/gm, " ")
    .replace(/.*\?title=(.*?)&.*/gm, `$1`);

  const { isLoading, data, error } = useFetch(props.url, {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
    initialData: "",
    onError: (error) => {
      showError(error);
    },
  });

  async function showError(error: Error) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: error.message,
    });
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to load article";
    if (error instanceof Error) {
      toast.message = error.message;
    }
  }

  const $ = cheerio.load(String(data));

  controllToast(true);

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

  const title =
    $(".mw-page-title-main").html() !== null
      ? $(".mw-page-title-main").html()!.replace("index.php?title=", "")
      : urlTitle?.replace("index.php?title=", "") ?? "";

  let html = "";
  $(".mw-parser-output").each(function (i, link) {
    html +=
      title === "Medizinische Abkürzungen"
        ? "<br><em>Dieser Artikel enthält eine zu lange Tabelle und kann in Raycast nicht angezeigt werden</em>"
        : $(link).html();
  });

  // authors
  let authors = isLoading
    ? "*Artikel wird geladen…*"
    : $(".detail-text").html() ?? "*Hier fehlt dein Wissen! Schreib diesen Artikel...*";
  if (authors != "") {
    if (authors.indexOf("Autoren:") <= 0 && authors.indexOf("Autor:") <= 0 && authors.indexOf("Artikel") <= 0) {
      authors = "Autor:" + authors;
    }
    authors = authors
      .replace(/\s{2,}/gm, ``)
      .replace(`:`, `: `)
      .replace(`+`, ` +`)
      .trim();
  }

  // table of contents
  const toc = $("#toc").html() ?? "";

  // "Articulus brevis minimus"
  const abm = $(".has-bg-gray-200").html() ?? "";

  // remove synonyms
  let markdown = "";
  synonyms.split("\n").forEach((element) => {
    html = html.replace(element, "");
  });

  const typeformLink = $(".typeform-share").attr("href") ?? "";
  const typeformName = $(".dcTypeformEmbed").find(".is-font-weight-bold").text() ?? "";

  const query = props.query ?? "";
  const queryText = props.query ? ` "` + props.query + `"` : "";

  const backTarget =
    prevurl != undefined && prevurl != ""
      ? "raycast://extensions/spacedog/doccheck/open-page?arguments=" +
        encodeURI(
          JSON.stringify({
            url: prevurl,
            navigationItems: JSON.stringify({
              back: backHistory.slice(0, backHistory.length - 2),
              forward: forwardHistory,
            }),
            query: props.query,
          })
        )
      : props.query != ""
      ? "raycast://extensions/spacedog/doccheck/doccheck-flexikon?fallbackText=" + encodeURI(query)
      : "raycast://extensions/spacedog/doccheck/doccheck-flexikon";
  const forwardTarget =
    nexturl != undefined && nexturl != ""
      ? "raycast://extensions/spacedog/doccheck/open-page?arguments=" +
        encodeURI(
          JSON.stringify({
            url: nexturl,
            navigationItems: JSON.stringify({
              back: backHistory,
              forward: forwardHistory.slice(0, forwardHistory.length - 2),
            }),
            query: props.query,
          })
        )
      : "";

  const goback =
    prevurl != undefined && prevurl != "" && preferences.openIn != "browser"
      ? "[← " + prevtitle + "](" + backTarget + ")\n"
      : props.query != "" && preferences.openIn != "browser"
      ? "[← Search" + queryText + "](" + backTarget + ")\n"
      : preferences.openIn != "browser"
      ? "[← Home](" + backTarget + ")\n"
      : "";
  const goforward =
    nexturl != undefined && nexturl != ""
      ? "| [" + nexttitle.replace("index.php?title=", "") + " →](" + forwardTarget + ")\n"
      : "";
  markdown = title ? "# " + title : "# " + urlTitle;
  markdown +=
    "\n " +
    goback +
    goforward +
    "\n" +
    authors +
    "\n\n" +
    mdSynonyms +
    nhm
      .translate(
        html
          .replace(toc ?? "", "")
          .replace(abm ?? "", "")
          .replace(/#cite_\D*\d*/gm, '"')
          .replace(/th>&nbsp;<\/th/gm, `th>.</th`)
          .replace(/tr>\n<th><\/th>/gm, `tr>\n<th>.</th>`)
          .replace(/<td><\/td>/gm, `<td>.</td>`)
          .replace(
            /<iframe.*src="(.*youtu.*)" frame.*><\/iframe>/gm,
            `<table><tbody><tr><td>YouTube Video: <a href="$1">$1</a></td></tr></tbody></table>`
          )
          .replace(
            /<iframe.*src="(.*doccheck.*)" frame.*><\/iframe>/gm,
            `<table><tbody><tr><td>DocCheck Video: <a href="$1">$1</a></td></tr></tbody></table>`
          )
          .replace(
            /<iframe.*src="(.*trinket.*)" frame.*><\/iframe>/gm,
            `<table><tbody><tr><td>Trinket Code: <a href="$1">$1</a></td></tr></tbody></table>`
          )
          .replace(
            /<iframe.*src="(.*sketchfab.*embed).*" frame.*><\/iframe>/gm,
            `<table><tbody><tr><td>Sketchfab 3D-Modell: <a href="$1">$1</a></td></tr></tbody></table>`
          )
          .replace(
            /<div class="dcTypeformEmbed.*/gm,
            `<table><tbody><tr><td>Typeform "` +
              typeformName +
              `": <a href="` +
              typeformLink +
              `">` +
              typeformLink +
              `</a></td></tr></tbody></table>`
          ) // "Schlaganfall"
          .replace(
            /<div class="dcEmbedError(.|\n)*?is-success" href="((.*doccheck.*)*?)"(.|\n)*?>\n.*<\/div>\n.*<\/div>\n<\/div>/gm,
            `<table><tbody><tr><td>DocCheck Exklusiv: <a href="$2">$2</a></td></tr></tbody></table>`
          )
          .replace(/<th colspan="2">(.*)(.|\n)*?<\/th>/gm, `<th>$1</th><th> </th>`) // "Schizophrenie"
          .replace(/<th colspan="3">(.*)<\/th>/gm, `<th>$1</th><th> </th><th> </th>`)
          .replace(/<th colspan="4">(.*)<\/th>/gm, `<th>$1</th><th> </th><th> </th><th> </th>`)
          .replace(/<th colspan="5">(.*)<\/th>/gm, `<th>$1</th><th> </th><th> </th><th> </th><th> </th>`)
          .replace(/<th colspan="6">(.*)<\/th>/gm, `<th>$1</th><th> </th><th> </th><th> </th><th> </th><th> </th>`) // "Diuretikum"
          // .replace(/<th colspan="3">(.*)<\/th>/gm, `<th>$1</th><th> </th><th> </th>`)
          .replace(/<th colspan="3">(.*)/gm, `<th>$1</th><th>.</th><th> .`) // "Rutherford-Klassifikation"
          .replace(/<td colspan="2">(.*)<\/td>/gm, `<td>$1 </td><td> </td>`)
          .replace(/<tr>\n<td rowspan="2">((.|\n)*?<tr>)/gm, `<tr>\n<td>$1<td>➥</td>`)
          .replace(/<tr>\n<td rowspan="3">((.|\n)*?<tr>)((.|\n)*?<tr>)/gm, `<tr>\n<td>$1<td>➥</td>$3<td>➥➥</td>`)
      )
      .replace(/\s{94}\|\n/gm, `\n`) // HEADING + ``SYNONYMS`` -TOC + ARTICLE (removal of anchors, relative to absolute links, putting a dot in the empty start line when calculating "Relatives Risiko" and "Odds Ratio" for correct display, removal of some table ends like DDx in "Scharlach")
      .replace(/\[ (!\[.*?\]\(.*?\)) ](.*)/g, `$1`); // "Enterostoma"

  if (!isLoading && preferences.historyItemsNumber > 0) {
    let date_publish = "";
    $("#last-edited").each((i, el) => {
      date_publish = $(el).find(".is-gray.has-no-decoration").text().trim();
    });
    setHistoryItem({
      title: title ?? "",
      url: props.url,
      description: $(".collapsible-content")
        .text()
        .trim()
        .replace(/(.*)\n.*/gm, `$1`),
      imageUrl: $(".dc-author-img-popover").attr("src") ?? "",
      date_publish: date_publish,
      author: (authors && authors.includes(":") ? authors.split(": ")[1] : "").split(",")[0],
    });
    controllToast(false);
  }

  async function checkFavouriteStatus(value: HistoryItem) {
    const favouritesString = (await LocalStorage.getItem(FAVOURITES_KEY)) as string;
    if (favouritesString != undefined) {
      let favouriteItems = JSON.parse(favouritesString);
      const currentArticleInHistory = favouriteItems.find((o: HistoryItem) => o.url === value.url);
      if (currentArticleInHistory !== undefined) {
        // delete old history entry when it already exists
        favouriteItems = favouriteItems.filter((item: HistoryItem) => item.url !== currentArticleInHistory.url);
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

  const backTitel = prevurl != undefined && prevurl != "" ? `Back to Article  "` + prevtitle + `"` : "Back to Home";

  checkFavouriteStatus({
    title: "",
    url: props.url,
    description: "",
    imageUrl: "",
    date_publish: "",
    author: "",
  });

  return (
    <Detail
      navigationTitle={navigationTitle + title}
      isLoading={isLoading}
      markdown={
        preferences.openIn === "browser"
          ? markdown.replace(/]\(\//gm, "](https://flexikon.doccheck.com/")
          : markdown.replace(/\[(.*?)\]\((\/.*?) "(.*?)"\)/g, function (match, p1, p2, p3) {
              const url = "https://flexikon.doccheck.com" + p2;
              const args = {
                url: url,
                navigationItems: JSON.stringify({ back: backHistory, forward: [] }),
                query: props.query,
              };
              const query = encodeURIComponent(JSON.stringify(args));
              return "[" + p1 + "](raycast://extensions/spacedog/doccheck/open-page?arguments=" + query + ")";
            })
      }
      actions={EntryActions(
        props.url,
        urlTitle,
        query,
        nexttitle,
        forwardTarget,
        forwardHistory,
        backTitel,
        backTarget,
        backHistory,
        favouriteTitle
      )}
    />
  );

  function EntryActions(
    url: string,
    urlTitle: string,
    query: string,
    nexttitle: string,
    forwardTarget: string,
    forwardHistory: Array<string>,
    backTitel: string,
    backTarget: string,
    backHistory: Array<string>,
    favouriteTitle: string
  ) {
    // 1. 3 MÖGLICHKEITEN: query + pop (backhistory = [] + forwardhistory = []); query + history + forwardHistory, query + history [KEIN FORWARD]
    // 2. 3 MÖGLICHKEITEN: pop; history + forward; history
    let openTitle = "";
    if (props.url.includes("&action=edit&redlink=1")) {
      openTitle = "Write Article in Browser";
    } else {
      openTitle = "Open Article in Browser";
    }

    const favouriteIcon = favouriteTitle === "Favourite" ? Icon.Star : Icon.StarDisabled;

    if (query.length != 0) {
      if (forwardHistory.length === 0 && backHistory.length === 1) {
        // DONT show forward Action, go back by pop
        const { pop } = useNavigation();
        return (
          <ActionPanel>
            <Action.Open
              icon={Icon.Globe}
              title={openTitle}
              target={url}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            <Action
              icon={favouriteIcon}
              title={favouriteTitle}
              onAction={setFavouriteItem}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action.Open
              icon={Icon.TextCursor}
              title="Edit Article in Browser"
              target={url ? url.replace(/\/[^/]+$/, "/index.php?title=") + url.split("/").pop() + "&veaction=edit" : ""}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
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
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
            <Action
              icon={Icon.ArrowLeftCircleFilled}
              title={backTitel}
              onAction={pop}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
            />
            <Action.Open
              icon={Icon.House}
              title={`Go Home`}
              target={"raycast://extensions/spacedog/doccheck/doccheck-flexikon"}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel>
        );
      } else if (forwardHistory.length === 1) {
        // DONT show forward Action
        return (
          <ActionPanel>
            <Action.Open
              icon={Icon.Globe}
              title={openTitle}
              target={url}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            <Action
              icon={favouriteIcon}
              title={favouriteTitle}
              onAction={setFavouriteItem}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action.Open
              icon={Icon.TextCursor}
              title="Edit Article in Browser"
              target={url ? url.replace(/\/[^/]+$/, "/index.php?title=") + url.split("/").pop() + "&veaction=edit" : ""}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
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
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
            <Action.Open
              icon={Icon.ArrowLeftCircleFilled}
              title={backTitel}
              target={backTarget}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
            />
            <Action.Open
              icon={Icon.House}
              title={`Go Home`}
              target={"raycast://extensions/spacedog/doccheck/doccheck-flexikon"}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel>
        );
      } else {
        return (
          <ActionPanel>
            <Action.Open
              icon={Icon.Globe}
              title={openTitle}
              target={url}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            <Action
              icon={favouriteIcon}
              title={favouriteTitle}
              onAction={setFavouriteItem}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action.Open
              icon={Icon.TextCursor}
              title="Edit Article in Browser"
              target={url ? url.replace(/\/[^/]+$/, "/index.php?title=") + url.split("/").pop() + "&veaction=edit" : ""}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
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
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
            <Action.Open
              icon={Icon.ArrowLeftCircleFilled}
              title={backTitel}
              target={backTarget}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
            />
            <Action.Open
              icon={Icon.House}
              title={`Go Home`}
              target={"raycast://extensions/spacedog/doccheck/doccheck-flexikon"}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
            <Action.Open
              icon={Icon.ArrowRightCircleFilled}
              title={`Forward to Article "` + nexttitle + `"`}
              target={forwardTarget}
              shortcut={{ modifiers: [], key: "arrowRight" }}
            />
          </ActionPanel>
        );
      }
    } else {
      if (forwardHistory.length === 0 && backHistory.length === 1) {
        const { pop } = useNavigation();
        return (
          <ActionPanel>
            <Action.Open
              icon={Icon.Globe}
              title={openTitle}
              target={url}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            <Action
              icon={favouriteIcon}
              title={favouriteTitle}
              onAction={setFavouriteItem}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action.Open
              icon={Icon.TextCursor}
              title="Edit Article in Browser"
              target={url ? url.replace(/\/[^/]+$/, "/index.php?title=") + url.split("/").pop() + "&veaction=edit" : ""}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action.Open
              icon={Icon.Uppercase}
              title={`AMBOSS Search "` + urlTitle + `"`}
              target={"https://next.amboss.com/de/search?q=" + encodeURI(urlTitle) + "&v=overview"}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
            <Action
              icon={Icon.ArrowLeftCircleFilled}
              title={backTitel}
              onAction={pop}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
            />
            <Action.Open
              icon={Icon.House}
              title={`Go Home`}
              target={"raycast://extensions/spacedog/doccheck/doccheck-flexikon"}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel>
        );
      } else if (forwardHistory.length === 1) {
        return (
          <ActionPanel>
            <Action.Open
              icon={Icon.Globe}
              title={openTitle}
              target={url}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            <Action
              icon={favouriteIcon}
              title={favouriteTitle}
              onAction={setFavouriteItem}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action.Open
              icon={Icon.TextCursor}
              title="Edit Article in Browser"
              target={url ? url.replace(/\/[^/]+$/, "/index.php?title=") + url.split("/").pop() + "&veaction=edit" : ""}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action.Open
              icon={Icon.Uppercase}
              title={`AMBOSS Search "` + urlTitle + `"`}
              target={"https://next.amboss.com/de/search?q=" + encodeURI(urlTitle) + "&v=overview"}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
            <Action.Open
              icon={Icon.ArrowLeftCircleFilled}
              title={backTitel}
              target={backTarget}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
            />
            <Action.Open
              icon={Icon.House}
              title={`Go Home`}
              target={"raycast://extensions/spacedog/doccheck/doccheck-flexikon"}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel>
        );
      } else {
        return (
          <ActionPanel>
            <Action.Open
              icon={Icon.Globe}
              title={openTitle}
              target={url}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            <Action
              icon={favouriteIcon}
              title={favouriteTitle}
              onAction={setFavouriteItem}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action.Open
              icon={Icon.TextCursor}
              title="Edit Article in Browser"
              target={url ? url.replace(/\/[^/]+$/, "/index.php?title=") + url.split("/").pop() + "&veaction=edit" : ""}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action.Open
              icon={Icon.Uppercase}
              title={`AMBOSS Search "` + urlTitle + `"`}
              target={"https://next.amboss.com/de/search?q=" + encodeURI(urlTitle) + "&v=overview"}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
            <Action.Open
              icon={Icon.ArrowLeftCircleFilled}
              title={backTitel}
              target={backTarget}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
            />
            <Action.Open
              icon={Icon.House}
              title={`Go Home`}
              target={"raycast://extensions/spacedog/doccheck/doccheck-flexikon"}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
            <Action.Open
              icon={Icon.ArrowRightCircleFilled}
              title={`Forward to Article "` + nexttitle + `"`}
              target={forwardTarget}
              shortcut={{ modifiers: [], key: "arrowRight" }}
            />
          </ActionPanel>
        );
      }
    }
  }
}

async function controllToast(loading: boolean) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Loading article",
  });
  if (!loading) {
    toast.hide();
  }
}

async function setHistoryItem(value: HistoryItem) {
  const historyString = (await LocalStorage.getItem(HISTORY_KEY)) as string;
  if (historyString != undefined) {
    let historyItems = JSON.parse(historyString);

    const currentArticleInHistory = historyItems.find((o: HistoryItem) => o.title === value.title);
    if (currentArticleInHistory != undefined) {
      // delete old history entry when it already exists
      historyItems = historyItems.filter((item: HistoryItem) => item !== currentArticleInHistory);
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
