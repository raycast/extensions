// Character List Types

interface GenshinAscensionStats {
  atk: number;
  def: number;
  hp: number;
  [key: string]: number;
}

interface GenshinCharacter extends LocalizedBase {
  CardImg: string;
  GachaImg: string;
  ascensionStats: GenshinAscensionStats;
  element: GenshinElement;
  weaponType: GenshinWeaponType;
  generatedImage: string;
}

type CharactersMap = Record<string, GenshinCharacter>;

// Single Character Detail Types

interface GenshinCharacterSingle {
  info: CharacterInfo;
  icons: CharacterIcons;
  ascension: CharacterAscension;
  skills: CharacterSkills;
  passives: CharacterPassives;
  constellations: CharacterConstellations;
  energy: EnergySource[];
  attacks: CombatAttack[];
  hyperlinks: Hyperlink[];
}

interface CharacterInfo {
  name: string;
  description: string;
  rarity: "QUALITY_ORANGE" | "QUALITY_PURPLE";
  weapon: string;
  birthday: string;
  element: string;
  constellation: string;
  attributes: Attribute[];
}

interface Attribute extends Record<string, number | string> {
  level: number;
  ascension: number;
  hp: number;
  atk: number;
  def: number;
}

interface CharacterIcons {
  forward: string;
  coop_img: string;
}

interface CharacterAscension {
  "202": number;
  exp: Record<string, number>;
  speciality: Record<string, number>;
  elemental: Record<string, number>;
  worldmonster: Record<string, number>;
  elitemonster: Record<string, number>;
}

interface Talent {
  name: string;
  icon: string;
  description: string;
  multipliers: Record<string, string[]>;
}

interface CharacterSkills {
  normalattack: Talent;
  elementalskill: Talent;
  elementalburst: Talent;
  leveling: {
    crown: Record<string, number>;
    books: Record<string, number>;
    worldmonster: Record<string, number>;
    weekly: Record<string, number>;
  };
}

interface IconDetail {
  name: string;
  description: string;
  icon: string;
}

type CharacterPassives = Record<string, IconDetail>;
type CharacterConstellations = Record<string, IconDetail>;

interface EnergySource {
  source: string;
  particles: string;
  chance: string;
  cd: string;
}

interface CombatAttack {
  name: string;
  icd_source: string;
  icd_rule: string;
  gauge: string;
  poise: string;
  element: string;
}

interface Hyperlink {
  id: number;
  name: string;
  description: string;
  params: string[];
}
