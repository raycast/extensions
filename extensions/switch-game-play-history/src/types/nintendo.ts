export interface IToken {
  expires_in: number;
  id_token: string;
  scope: string[];
  access_token: string;
  token_type: string;
}
export interface IRecentPlayHistory {
  playedDate: string;
  dailyPlayHistories: {
    titleId: string;
    titleName: string;
    imageUrl: string;
    totalPlayedMinutes: number;
  }[];
}
export interface IPlayHistory {
  titleId: string;
  titleName: string;
  deviceType: string;
  imageUrl: string;
  lastUpdatedAt: string;
  firstPlayedAt: string;
  lastPlayedAt: string;
  totalPlayedDays: number;
  totalPlayedMinutes: number;
}
export interface IPlayHistories {
  playHistories: IPlayHistory[];
  hiddenTitleList: [];
  recentPlayHistories: IRecentPlayHistory[];
  lastUpdatedAt: string;
}
export interface ISessionToken {
  code: string;
  session_token: string;
}
