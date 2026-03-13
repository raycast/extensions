import { Icon } from "@raycast/api";

export const API_BASE_URL = "https://api.nobelprize.org/2.1/";
export const DEAULT_LIMIT = 25;

export const ICONS = {
  Chemistry: Icon.Syringe,
  "Economic Sciences": Icon.LineChart,
  Literature: Icon.Book,
  Peace: Icon.Globe,
  Physics: Icon.Ruler,
  "Physiology or Medicine": Icon.Dna,
};

export const CATEGORIES = {
  che: "Chemistry",
  eco: "Economic Sciences",
  lit: "Literature",
  pea: "Peace",
  phy: "Physics",
  med: "Physiology or Medicine",
};
