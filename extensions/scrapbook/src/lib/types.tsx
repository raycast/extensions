export interface PostType {
  id: string;
  user: UserType;
  timestamp: number;
  slackUrl: string | null;
  postedAt: Date;
  text: string;
  attachments: string[];
  mux: string[];
  reactions: ReactionType[];
}

export interface ReactionType {
  name: string;
  usersReacted: string[];
  url?: string;
  char?: string;
}

export interface UserType {
  id: string;
  slackID: null | string;
  email: null | string;
  emailVerified: Date | null;
  username: string;
  streakCount: number | null;
  maxStreaks: number | null;
  displayStreak: boolean | null;
  streaksToggledOff: null;
  customDomain: null | string;
  cssURL: null;
  website: null | string;
  github: null | string;
  image: null;
  fullSlackMember: boolean | null;
  avatar: string;
  webring: string[];
  newMember: boolean;
  timezoneOffset: number | null;
  timezone: null | string;
  pronouns: null;
  customAudioURL: null;
  lastUsernameUpdatedTime: Date | null;
  webhookURL: null;
}
