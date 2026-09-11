import { Color } from "@raycast/api";

export const API_ENDPOINT = "https://api.lunaris.moe/data";

export const ELEMENT_COLORS: Record<GenshinElement, string> = {
  Pyro: "#EE7935",
  Hydro: "#4CC2F1",
  Electro: "#AF77E2",
  Cryo: "#9FD6E3",
  Anemo: "#74C2A8",
  Geo: "#FFC92C",
  Dendro: "#A5C83B",
  Unknown: "#FFFFFF",
};

export const WEAPON_TYPE: Record<GenshinWeaponType, string> = {
  WEAPON_BOW: "Bow",
  WEAPON_CATALYST: "Catalyst",
  WEAPON_CLAYMORE: "Claymore",
  WEAPON_POLE: "Polearm",
  WEAPON_SWORD_ONE_HAND: "Sword",
};

export const RARITY: Record<GenshinQualityType, number> = {
  QUALITY_ORANGE_SP: 5,
  QUALITY_ORANGE: 5,
  QUALITY_PURPLE: 4,
  QUALITY_BLUE: 3,
  QUALITY_GREEN: 2,
  QUALITY_WHITE: 1,
};

export const RARITY_COLORS: Record<GenshinQualityType, string> = {
  QUALITY_ORANGE_SP: "#d45646",
  QUALITY_ORANGE: "#c87c24",
  QUALITY_PURPLE: "#9470bb",
  QUALITY_BLUE: "#5987ad",
  QUALITY_GREEN: "#3c783f",
  QUALITY_WHITE: "#bcbab3",
};

export const RARITY_COLORS_RAYCAST: Record<GenshinQualityType, Color> = {
  QUALITY_ORANGE_SP: Color.Red,
  QUALITY_ORANGE: Color.Orange,
  QUALITY_PURPLE: Color.Purple,
  QUALITY_BLUE: Color.Blue,
  QUALITY_GREEN: Color.Green,
  QUALITY_WHITE: Color.PrimaryText,
};
