export enum ClassName {
  DRUID = "Druid",
  HUNTER = "Hunter",
  MAGE = "Mage",
  PALADIN = "Paladin",
  PRIEST = "Priest",
  ROGUE = "Rogue",
  SHAMAN = "Shaman",
  WARLOCK = "Warlock",
  WARRIOR = "Warrior",
  DEMONHUNTER = "Demon Hunter",
}

export interface Deck {
  title: string;
  code: string;
  className: ClassName;
  winrate: number | null;
  dust: number;
  slots: CardSlot[];
}

export interface CardSlot {
  card: Card;
  amount: 1 | 2;
}

export enum Rarity {
  COMMON = "Common",
  RARE = "Rare",
  EPIC = "Epic",
  LEGENDARY = "Legendary",
}

export interface Card {
  title: string;
  rarity: Rarity;
  mana: number;
}
