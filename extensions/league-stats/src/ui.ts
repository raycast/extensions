import { Color, Icon, Image } from "@raycast/api";
import type { Result } from "./match";
import { Platform, REGIONS } from "./regions";
import { ringDataUri } from "./ring";
import { RiotError } from "./riot";

export const RESULT_LABEL: Record<Result, string> = { win: "Win", loss: "Loss", remake: "Remake" };
export const RESULT_COLOR: Record<Result, Color> = {
  win: Color.Green,
  loss: Color.Red,
  remake: Color.SecondaryText,
};

export function winRateColor(rate: number): Color {
  return rate >= 0.5 ? Color.Green : Color.Red;
}

/** A ring filled to the win rate. Hex colors, because SVG cannot resolve Raycast's named theme colors. */
export function winRateIcon(rate: number): Image.ImageLike {
  return { source: ringDataUri(rate, rate >= 0.5 ? "#34c759" : "#ff453a") };
}

export function profileLinks(gameName: string, tagLine: string, platform: Platform) {
  const slug = encodeURIComponent(`${gameName}-${tagLine}`);
  return {
    opgg: `https://www.op.gg/summoners/${REGIONS[platform].opgg}/${slug}`,
    ugg: `https://u.gg/lol/profile/${platform}/${slug}/overview`,
  };
}

export interface ErrorInfo {
  title: string;
  description: string;
  icon: Image.ImageLike;
  /** Bad keys get a shortcut to the preferences. */
  isAuth: boolean;
}

export function describeError(error: unknown): ErrorInfo {
  if (error instanceof RiotError) {
    switch (error.kind) {
      case "auth":
        return {
          title: "Riot API Key Rejected",
          description:
            "Development keys expire every 24 hours. Generate a new one at developer.riotgames.com and paste it into the extension preferences.",
          icon: Icon.Key,
          isAuth: true,
        };
      case "not-found":
        return { title: "Player Not Found", description: error.message, icon: Icon.MagnifyingGlass, isAuth: false };
      case "rate-limit":
        return {
          title: "Rate Limited",
          description: `${error.message} Development keys allow 100 requests every 2 minutes; loaded matches are cached, so retrying is cheap.`,
          icon: Icon.Clock,
          isAuth: false,
        };
      case "network":
        return { title: "Can't Reach Riot", description: error.message, icon: Icon.WifiDisabled, isAuth: false };
      default:
        return { title: "Riot API Error", description: error.message, icon: Icon.ExclamationMark, isAuth: false };
    }
  }
  return {
    title: "Something Went Wrong",
    description: error instanceof Error ? error.message : String(error),
    icon: Icon.ExclamationMark,
    isAuth: false,
  };
}
