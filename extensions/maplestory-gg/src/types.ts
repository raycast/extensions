export type CharacterData = {
  CharacterImageURL: string;
  Class: string;
  ClassRank?: number;
  EXP: number;
  GlobalRanking?: number;
  LegionLevel?: number;
  LegionPower?: number;
  LegionRank?: number;
  Level: number;
  Name: string;
  Server: string;
  ServerRank?: number;
  Region: string;
  Source?: "nexon";
  LegionUnavailable?: boolean;
};

export type RankingEntry = {
  characterName: string;
  characterImgURL: string;
  jobName: string;
  exp: number;
  level: number;
  rank: number;
  worldID: number;
  legionLevel: number;
  raidPower: number;
};

export type RankingResponse = {
  totalCount: number;
  ranks: RankingEntry[];
};
