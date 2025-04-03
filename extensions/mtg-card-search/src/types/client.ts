import { Legality, Rarity } from "./server";

export interface MtgCardMetadata {
  set: {
    name: string;
    uri: string;
  };
  manaCost: string;
  rarity: Rarity;
  prices: MtgCardPrices;
  keywords: string[];
  artist: string;
  gameChanger: boolean;
  legalities: {
    commander: Legality;
    standard: Legality;
    modern: Legality;
    duel: Legality;
  };
}

export interface MtgCardFace {
  name: string;
  imageUrl: string;
  traits: string;
  text: string;
  flavor: string | undefined;
}

export interface MtgCard {
  id: string;
  fullName: string;
  links: MtgCardLinks;
  metadata: MtgCardMetadata;
  faces: MtgCardFace[];
}

interface MtgCardLinks {
  cardMarket: string;
  tcgPlayer: string;
  cardHoarder: string;
  edhrec: string;
  scryfall: string;
}

interface MtgCardPrices {
  eur: string | null;
  usd: string | null;
}
