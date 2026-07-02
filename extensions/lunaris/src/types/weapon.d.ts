// Weapon List Types

interface GenshinWeapon extends LocalizedBase {
  ascensionStats: Record<string, number>;
  weaponIcon: string;
  weaponType: string;
}

type WeaponsMap = Record<string, GenshinWeapon>;

// Single Weapon Detail types

interface WeaponLevelStats extends Record<string, number> {
  atk: number;
}

interface GenshinWeaponDetail {
  name: string;
  weaponDesc: string;
  weaponIcon: string;
  weaponType: GenshinWeaponType;
  qualityType: GenshinQualityType;
  ascension: {
    count: number;
    icon: string;
  }[];
  passive?: {
    name: string;
    refinements: Record<string, string>;
  };
  stats: Record<string, WeaponLevelStats>;
}
