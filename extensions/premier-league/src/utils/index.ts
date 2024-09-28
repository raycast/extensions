import { format, parse } from "date-fns";

export const awardMap: Record<string, string> = {
  CHAMPIONS: "Premier League Champion",
  GAME_CHANGER_AWARD: "Game Changer",
  GOAL_OF_THE_MONTH: "Goal of the Month",
  GOAL_OF_THE_SEASON: "Goal of the Season",
  GOLDEN_BOOT: "Golden Boot",
  GOLDEN_GLOVE: "Golden Glove",
  MANAGER_OF_THE_MONTH: "Manager of the Month",
  MANAGER_OF_THE_SEASON: "Manager of the Season",
  MOST_IMPROBABLE_AWARD: "Most Improbable Comeback",
  MOST_POWERFUL_GOAL: "Most Powerful Goal",
  PLAYER_OF_THE_MONTH: "Player of the Month",
  PLAYER_OF_THE_SEASON: "Player of the Season",
  PLAYMAKER: "Playmaker",
  SAVE_OF_THE_MONTH: "Save of the Month",
  SAVE_OF_THE_SEASON: "Save of the Season",
  YNG_PLAYER_OF_THE_SEASON: "Young Player of the Season",
};

export const getFlagEmoji = (isoCode?: string) => {
  if (!isoCode) return "🏴";

  if (isoCode === "GB-ENG") {
    return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  }
  if (isoCode === "GB-WLS") {
    return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";
  }
  if (isoCode === "GB-SCT") {
    return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  }
  if (isoCode === "GB-NIR") {
    // The only official flag in Northern Ireland is the Union Flag of the United Kingdom.
    return "🇬🇧";
  }

  return isoCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
};

export const convertToLocalTime = (
  label?: string,
  outputFormat?: string,
  customFormat?: string,
) => {
  if (!label) return undefined;

  const inputFormat =
    customFormat ??
    (label.includes("BST") || label.includes("GMT")
      ? "EEE d MMM yyyy, HH:mm XXX"
      : "EEE d MMM yyyy");

  if (inputFormat.length === 14 && outputFormat?.length === 5) return undefined;

  const time = label.replace("BST", "+01:00").replace("GMT", "+00:00");

  return format(
    parse(time, inputFormat, new Date()),
    outputFormat || "EEE d MMM yyyy, HH:mm",
  );
};

export const getProfileImg = (optaId: string | undefined) => {
  return `https://resources.premierleague.com/premierleague/photos/players/110x140/${optaId}.png`;
};

export const getClubLogo = (optaId: string) => {
  return `https://resources.premierleague.com/premierleague/badges/100/${optaId}@x2.png`;
};

export const positionMap: Record<string, string> = {
  G: "Goalkeepers",
  D: "Defenders",
  M: "Midfielders",
  F: "Forwards",
};
