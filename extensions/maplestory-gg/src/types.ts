export type GraphDataItem = {
  AvatarURL: string;
  ClassID: number;
  ClassRankGroupID: number;
  CurrentEXP: number;
  DateLabel: string;
  EXPDifference: number;
  EXPToNextLevel: number;
  ImportTime: number;
  Level: number;
  Name: string;
  ServerID: number;
  ServerMergeID: number;
  TotalOverallEXP: number;
};

export type CharacterData = {
  AchievementPoints: number;
  AchievementRank: number;
  CharacterImageURL: string;
  Class: string;
  ClassRank: number;
  EXP: number;
  EXPPercent: number;
  GlobalRanking: number;
  GraphData: GraphDataItem[];
  Guild: string;
  LegionCoinsPerDay: number;
  LegionLevel: number;
  LegionPower: number;
  LegionRank: number;
  Level: number;
  Name: string;
  Server: string;
  ServerClassRanking: number;
  ServerRank: number;
  ServerSlug: string;
  Region: string;
};

export type CharacterResponse = {
  CharacterData: CharacterData;
};
