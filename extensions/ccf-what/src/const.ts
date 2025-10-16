export const A_ICON = "../assets/tier.imageset/A-tier.svg";
export const B_ICON = "../assets/tier.imageset/B-tier.svg";
export const C_ICON = "../assets/tier.imageset/C-tier.svg";

export const TOGGLE_ICON_DARK = "../assets/action.imageset/toggles-dark.svg";
export const TOGGLE_ICON_LIGHT = "../assets/action.imageset/toggles-light.svg";

export const CONF_ICON_DARK = "../assets/conference.imageset/conference-paper@3x.png";
export const CONF_ICON_LIGHT = "../assets/conference.imageset/conferencepaper@3x.png";
export const JOUR_ICON_DARK = "../assets/journal.imageset/journal-article@3x-1.png";
export const JOUR_ICON_LIGHT = "../assets/journal.imageset/journal-article@3x.png";

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
  Conference: { dark: CONF_ICON_DARK, light: CONF_ICON_LIGHT },
  Journal: { dark: JOUR_ICON_DARK, light: JOUR_ICON_LIGHT },
};

export const TIER_ICON = {
  A: { dark: A_ICON, light: A_ICON },
  B: { dark: B_ICON, light: B_ICON },
  C: { dark: C_ICON, light: C_ICON },
};

export const TOGGLE_ICON = { dark: TOGGLE_ICON_DARK, light: TOGGLE_ICON_LIGHT };

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
