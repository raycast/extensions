import { Color, Icon, Image } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { format, parse } from "date-fns";
import { Fixture } from "../types";

export const awardMap: Record<string, string> = {
  // CHAMPIONS: "Premier League Champion",
  GCOTS: "Game Changer",
  GOTM: "Goal of the Month",
  GOTS: "Goal of the Season",
  GB: "Golden Boot",
  GG: "Golden Glove",
  MOTM: "Manager of the Month",
  MOTS: "Manager of the Season",
  MICOTS: "Most Improbable Comeback",
  MPGOTS: "Most Powerful Goal",
  POTM: "Player of the Month",
  POTS: "Player of the Season",
  PM: "Playmaker",
  SOTM: "Save of the Month",
  SOTS: "Save of the Season",
  YPOTS: "Young Player of the Season",
};

export const livePeriods = ["FirstHalf", "SecondHalf", "HalfTime"];

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

export const convertISOToLocalTime = (
  str: string,
  tz: string = "GMT",
  output: string = "EEE d MMM yyyy, HH:mm",
) => {
  try {
    const stringWithTZ = tz === "BST" ? `${str}+01:00` : `${str}+00:00`;
    return format(new Date(stringWithTZ), output);
  } catch (error) {
    showFailureToast(error, { message: `Invalid ISO date value: ${str}` });

    return undefined;
  }
};

export const formatDate = (str: string, input: string, output: string) => {
  try {
    return format(parse(str, input, new Date()), output);
  } catch (error) {
    showFailureToast(error, { message: `Invalid time value: ${str}` });

    return undefined;
  }
};

export const getProfileImg = (optaId: string | undefined) => {
  return `https://resources.premierleague.com/premierleague25/photos/players/110x140/${optaId}.png`;
};

export const getClubLogo = (optaId: string) => {
  return `https://resources.premierleague.com/premierleague25/badges/${optaId}.png`;
};

export const positions = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

export const getMatchStatusIcon = (match: Fixture) => {
  let icon: Image.ImageLike;
  if (!match.kickoff) {
    icon = { source: Icon.Clock };
  } else if (livePeriods.includes(match.period)) {
    icon = { source: Icon.Livestream, tintColor: Color.Red };
  } else if (match.period === "FullTime") {
    icon = { source: Icon.CheckCircle, tintColor: Color.Green };
  } else {
    icon = Icon.Calendar;
  }

  return icon;
};
