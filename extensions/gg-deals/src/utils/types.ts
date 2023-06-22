export class DealEntry {
  readonly gameName: string;
  readonly imageUrl: string;
  readonly price: string;
  readonly priceKeyshop: string;
  readonly url: string;
  readonly releaseDate: string;
  readonly genres: string;

  constructor(
    gameName: string,
    imageUrl: string,
    price: string,
    priceKeyshop: string,
    url: string,
    releaseDate: string,
    genres: string
  ) {
    this.gameName = gameName;
    this.imageUrl = imageUrl;
    this.price = price;
    this.priceKeyshop = priceKeyshop;
    this.url = url;
    this.releaseDate = releaseDate;
    this.genres = genres;
  }
}

export interface SearchState {
  results: DealEntry[];
  newDeals: DealEntry[];
  bestDeals: DealEntry[];
  historicalLows: DealEntry[];
  isLoading: boolean;
  searchText: string;
}

export interface DetailsProps {
  url: string;
  name: string;
}

export interface DetailsState {
  result: DetailEntry | null;
  isLoading: boolean;
}

export class DetailEntry {
  readonly gameName: string;
  readonly imageUrl: string;
  readonly linkWidget: string;
  readonly priceOfficial: string;
  readonly priceKeyshops: string;
  readonly pricesByPriceLabels: [string, string, string][];
  readonly pricesByTimeLabels: [string, string, string][];
  readonly editions: string[];

  constructor(
    gameName: string,
    imageUrl: string,
    linkWidget: string,
    priceOfficial: string,
    priceKeyshops: string,
    pricesByPriceLabels: [string, string, string][],
    pricesByTimeLabels: [string, string, string][],
    editions: string[]
  ) {
    this.gameName = gameName;
    this.imageUrl = imageUrl;
    this.linkWidget = linkWidget;
    this.priceOfficial = priceOfficial;
    this.priceKeyshops = priceKeyshops;
    this.pricesByPriceLabels = pricesByPriceLabels;
    this.pricesByTimeLabels = pricesByTimeLabels;
    this.editions = editions;
  }
}

export const genreColors: { [key: string]: string } = {
  Action: "#3a86ff",
  Adventure: "#32cd32",
  Casual: "#ffa500",
  "Early Access": "#800080",
  "Free to Play": "#ff69b4",
  Indie: "#ff4500",
  "Massively Multiplayer": "#ffd700",
  Racing: "#ff0000",
  RPG: "#8a2be2",
  Simulation: "#00ced1",
  Sports: "#008000",
  Strategy: "#800000",
};

export const editionColors: { [key: string]: string } = {
  Standard: "",
  Ultimate: "#3a86ff",
  Deluxe: "#DDFFBB",
  Aftermath: "#ff4b5c",
  Premium: "#ffa500",
};
