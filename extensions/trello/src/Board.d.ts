export interface Board {
  id: string;
  name: string;
  desc: string;
  descData: string;
  closed: boolean;
  idMemberCreator: string;
  url: string;
  shortUrl: string;
  prefs: Prefs;
  starred: boolean;
  memberships: string;
  shortLink: string;
  dateLastActivity: string;
  dateLastView: string;
  organization?: Organization;
}
export interface Prefs {
  background: string;
  backgroundImage: string;
  backgroundImageScaled?: BackgroundImageScaledEntity[] | null;
  backgroundTile: boolean;
  backgroundBrightness: string;
  backgroundBottomColor: string;
  backgroundTopColor: string;
}
export interface BackgroundImageScaledEntity {
  width: number;
  height: number;
  url: string;
}

export interface Organisation {
  id: string;
  displayName: string;
}
