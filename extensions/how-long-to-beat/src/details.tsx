import { Action, ActionPanel, Detail } from "@raycast/api";
import { HowLongToBeatEntry } from "howlongtobeat";
import { HltbSearch } from "./hltbsearch";
import { pluralize } from "./helpers";
import * as cheerio from "cheerio";
import { useGameDetailFetch } from "./useGameDetailFetch";

interface DetailsProps {
  id: string;
  name: string;
}

export function Details(props: DetailsProps) {
  const { id, name } = props;

  const { isLoading, data: result, markdown } = useGameDetailFetch(id);

  const url = `${HltbSearch.DETAIL_URL}${id}`;

  const mainStoryHours = result?.gameplayMain || 0;
  const mainStoryText = mainStoryHours >= 1 ? `${result?.gameplayMain} ${pluralize(mainStoryHours, "hour")}` : "-";

  const mainExtraHours = result?.gameplayMainExtra || 0;
  const mainExtraText = mainExtraHours >= 1 ? `${result?.gameplayMainExtra} ${pluralize(mainExtraHours, "hour")}` : "-";

  const completionistsHours = result?.gameplayCompletionist || 0;
  const completionistsText =
    completionistsHours >= 1 ? `${result?.gameplayCompletionist} ${pluralize(completionistsHours, "hour")}` : "-";

  const metadata = result ? (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Main Story" text={mainStoryText} />
      <Detail.Metadata.Label title="Main + Extras" text={mainExtraText} />
      <Detail.Metadata.Label title="Completionists" text={completionistsText} />
    </Detail.Metadata>
  ) : null;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard title="Copy URL" content={url} />
        </ActionPanel>
      }
      metadata={metadata}
    />
  );
}

export function parseDetails(html: string, id: string): HowLongToBeatEntry {
  const $ = cheerio.load(html);
  let gameName = "";
  let imageUrl = "";
  const timeLabels: Array<string[]> = new Array<string[]>();
  let gameplayMain = 0;
  let gameplayMainExtra = 0;
  let gameplayComplete = 0;

  gameName = $("div[class*='profile_header'].shadow_text").text();
  imageUrl = $("div[class*='game_image']").find("img")[0]?.attribs?.src || "";

  const divElements = $("div[class*='game_times'] div");

  const gameDescription = $(".in.back_primary.shadow_box div[class*='GameSummary'][class*='large']").text();

  let platforms: string[] = [];

  $("div[class*='GameSummary'][class*='profile_info']").each(function () {
    const metaData = $(this).text();
    const platformKeyword = metaData.includes("Platforms:") ? "Platforms:" : "Platform:";
    platforms = metaData
      .replace(/\n/g, "")
      .replace(platformKeyword, "")
      .split(",")
      .map((data) => data.trim());
  });

  divElements.each(function () {
    const type: string = $(this).find("h4").text();
    const time: number = parseTime($(this).find("h5").text());
    if (type.startsWith("Main Story") || type.startsWith("Single-Player") || type.startsWith("Solo")) {
      gameplayMain = time;
      timeLabels.push(["gameplayMain", type]);
    } else if (type.startsWith("Main + Sides") || type.startsWith("Co-Op")) {
      gameplayMainExtra = time;
      timeLabels.push(["gameplayMainExtra", type]);
    } else if (type.startsWith("Completionist") || type.startsWith("Vs.")) {
      gameplayComplete = time;
      timeLabels.push(["gameplayComplete", type]);
    }
  });

  return new HowLongToBeatEntry(
    id,
    gameName,
    gameDescription,
    platforms,
    imageUrl,
    timeLabels,
    gameplayMain,
    gameplayMainExtra,
    gameplayComplete,
    1,
    gameName,
  );
}

/**
 * Utility method used for parsing a given input text (like
 * &quot;44&#189;&quot;) as double (like &quot;44.5&quot;). The input text
 * represents the amount of hours needed to play this game.
 *
 * @param text
 *            representing the hours
 * @return the pares time as double
 */
function parseTime(text: string): number {
  // '65&#189; Hours/Mins'; '--' if not known
  if (text.startsWith("--")) {
    return 0;
  }
  if (text.includes(" - ")) {
    return handleRange(text);
  }
  return getTime(text);
}

function handleRange(text: string): number {
  const range: Array<string> = text.split(" - ");
  const d: number = (getTime(range[0]) + getTime(range[1])) / 2;
  return d;
}

/**
 * Parses a string to get a number
 * @param text,
 *            can be '12 Hours' or '5½ Hours' or '50 Mins'
 * @return the ttime, parsed from text
 */
function getTime(text: string): number {
  //check for Mins, then assume 1 hour at least
  const timeUnit = text.substring(text.indexOf(" ") + 1).trim();
  if (timeUnit === "Mins") {
    return 1;
  }
  const time: string = text.substring(0, text.indexOf(" "));
  if (time.includes("½")) {
    return 0.5 + parseInt(time.substring(0, text.indexOf("½")));
  }
  return parseInt(time);
}
