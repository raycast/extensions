export interface TitlePresence {
  titleId: string;
  titleName: string;
  titleType: string;
  state: string; // "Active" | "Inactive"
  lastModified: string;
}

export interface Friend {
  xuid: string;
  gamertag: string;
  modernGamertag: string;
  displayName: string;
  displayPicRaw: string;
  gamerScore: string;
  presenceState: string; // "Online" | "Away" | "Offline"
  presenceText: string;
  lastSeenDateTimeUtc: string;
  titlePresences: TitlePresence[] | null;
  isBroadcasting: boolean;
}

export interface FriendsResponse {
  people: Friend[];
}
