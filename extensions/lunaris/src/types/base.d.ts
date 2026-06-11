type GenshinElement = "Cryo" | "Pyro" | "Hydro" | "Electro" | "Anemo" | "Geo" | "Dendro" | "Unknown";

type GenshinWeaponType = "WEAPON_SWORD_ONE_HAND" | "WEAPON_CLAYMORE" | "WEAPON_POLE" | "WEAPON_BOW" | "WEAPON_CATALYST";

type GenshinQualityType =
  | "QUALITY_WHITE"
  | "QUALITY_PURPLE"
  | "QUALITY_BLUE"
  | "QUALITY_GREEN"
  | "QUALITY_ORANGE"
  | "QUALITY_ORANGE_SP";

interface LocalizedBase {
  chsName: string;
  enName: string;
  ptName: string;
  ruName: string;
  qualityType: GenshinQualityType;
  releaseDate: number;
}

interface LocalizedDescription {
  chsDescription: string;
  enDescription: string;
  ptDescription: string;
  ruDescription: string;
}
