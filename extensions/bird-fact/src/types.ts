export type Species = {
  scientific_name: string;
  common_name: string;
};

export type Fact = {
  id: number;
  fact: string;
  species: Species;
  photo?: Photo;
};

export type Photo = {
  url: string;
  photographer: string;
  source: string;
};

export interface Preferences {
  locale: "da" | "en";
}
