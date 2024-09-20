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
  code: number;
  value: string;
  name: string;
  aliases: string[];
  old_name: string;
  recentlyUsed?: boolean;
  isExtra?: boolean;
  score?: number;
};

export type CharAlias = {
  [key: number]: string[];
};

export type CharacterSet = {
  sectionTitle: string;
  items: Character[];
};
