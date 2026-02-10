export interface Character {
  shape: string;
  name: string;
}

export interface Section {
  title: string;
  items: Character[];
}

export type Dataset = Record<string, Section[]>;
