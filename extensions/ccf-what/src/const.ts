export const A_ICON = "../assets/tier.imageset/A-tier.svg";
export const B_ICON = "../assets/tier.imageset/B-tier.svg";
export const C_ICON = "../assets/tier.imageset/C-tier.svg";

export const TOGGLE_ICON = "../assets/action.imageset/toggles.svg";

export const CONF_ICON_DARK = "../assets/conference.imageset/conference-paper@3x.png";
export const JOUR_ICON_DARK = "../assets/journal.imageset/journal-article@3x-1.png";

export enum UPDATE_INTERVAL {
  NEVER = "never",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export const TYPE_LOCALIZATION = {
  Journal: "期刊",
  Conference: "会议",
};

export const TYPE_ICON = {
  Conference: CONF_ICON_DARK,
  Journal: JOUR_ICON_DARK,
};

export const TIER_ICON = {
  A: A_ICON,
  B: B_ICON,
  C: C_ICON,
};

export const DEFAULT_FETCH_INTERVAL = UPDATE_INTERVAL.NEVER;
export const DEFAULT_FETCH_URL =
  "https://cdn.jsdelivr.net/gh/CrackedPoly/ccf-what@latest/src/resource/CCF_Ranking_2022.json";

export const parseInterval = (interval: string) => {
  switch (interval) {
    case UPDATE_INTERVAL.NEVER:
      return -1;
    case UPDATE_INTERVAL.DAILY:
      return 24 * 60 * 60 * 1000;
    case UPDATE_INTERVAL.WEEKLY:
      return 7 * 24 * 60 * 60 * 1000;
    case UPDATE_INTERVAL.MONTHLY:
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return -1;
  }
};
