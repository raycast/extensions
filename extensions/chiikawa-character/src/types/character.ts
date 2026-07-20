export type CharacterCategory = "main" | "friends" | "yoroi-san";

export interface CharacterRelationship {
  character: string;
  description: string;
}

export interface ChiikawaCharacter {
  id: string;
  nameEn: string;
  nameJp: string;
  nameRomanized: string;
  category: CharacterCategory;
  personality: string[];
  description: string;
  relationships: CharacterRelationship[];
  funFacts: string[];
  icon: string;
  officialUrl: string;
  catchphrases?: string[];
}
