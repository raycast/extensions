export interface GraphicPublication {
  id: string;
  name: string;
  volume: string;
  price: string;
  editorial: string;
  publicationDate: string;
  url: string;
  frontImageUrl: string;
}

export interface GraphicPublicationList {
  [key: string]: GraphicPublication[];
}

export interface Collection {
  id: string;
  name: string;
  url: string;
  frontImageUrl: string;
}

export interface Publisher {
  [key: string]: { editorial: string; storeUrl: string };
}
