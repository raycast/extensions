export interface Game {
  npCommunicationId: string;
  trophyTitleName: string;
  trophyTitleIconUrl: string;
  trophyTitlePlatform: string;
  hasTrophyGroups: boolean;
  definedTrophies: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  earnedTrophies: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  hiddenFlag: boolean;
  progress: number;
  lastUpdatedDateTime: string;
}

export interface Trophy {
  trophyId: number;
  trophyHidden: boolean;
  trophyType: string;
  trophyName: string;
  trophyDetail: string;
  trophyIconUrl: string;
  earned: boolean;
}
