export type Block = {
  blockName: string;
  startCode: number;
  endCode: number;
};

export type BlockExtra = Block & {
  extra?: number[];
};

export type Dataset = {
  selectedBlock: BlockExtra | null;
  blocks: BlockExtra[];
  characters: Character[];
};

export type Character = {
  /** Code */
  c: number;
  /** Value */
  v: string;
  /** Name */
  n: string;
  /** Aliases */
  a: string[];
  /** Old name */
  o: string;
  recentlyUsed?: boolean;
  isExtra?: boolean;
  score?: number;
};

export type CharAlias = {
  [key: number]: string[];
};

export type CharacterSection = {
  sectionTitle: string;
  items: Character[];
};
