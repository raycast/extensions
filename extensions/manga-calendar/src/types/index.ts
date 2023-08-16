export interface Manga {
  name: string;
  volume: string;
  price: string;
  editorial: string;
  publicationDate: string;
  url: string;
  frontImageUrl: string;
}

export interface MangaList {
  [key: string]: Manga[];
}

export interface Collection {
  name: string;
  url: string;
  frontImageUrl: string;
}

export interface Publisher {
  [key: string]: { editorial: string; storeUrl: string };
}
