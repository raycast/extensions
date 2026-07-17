export interface CardData {
  nhits: number;
  cards: Card[];
}

export interface Card {
  type: string;
  nameShort: string;
  name: string;
  value: string;
  valueInt: number;
  meaningUp: string;
  meaningRev: string;
  desc: string;
  imgUrl: string;
  suit?: string;
  reversed?: boolean;
}
