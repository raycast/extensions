export enum Identifier {
  Bluesky = "bluesky",
  devto = "devto",
  Discord = "discord",
  Dribbble = "dribbble",
  Facebook = "facebook",
  hashnode = "hashnode",
  "instagram-standalone" = "instagram-standalone",
  Instagram = "instagram",
  Lemmy = "lemmy",
  "LinkedIn Page" = "linkedin-page",
  LinkedIn = "linkedin",
  "mastodon-custom" = "mastodon-custom",
  Mastodon = "mastodon",
  Medium = "medium",
  Nostr = "nostr",
  Pinterest = "pinterest",
  Reddit = "reddit",
  Slack = "slack",
  Telegram = "telegram",
  Threads = "threads",
  Tiktok = "tiktok",
  vk = "vk",
  WordPress = "wordpress",
  wrapcast = "wrapcast",
  X = "x",
  YouTube = "youtube",
}
export type Integration = {
  id: string;
  name: string;
  identifier: Identifier;
  picture: string;
  disabled: boolean;
  profile: string;
};

export enum State {
  QUEUE = "QUEUE",
  PUBLISHED = "PUBLISHED",
  ERROR = "ERROR",
  DRAFT = "DRAFT",
}
export type Post = {
  id: string;
  content: string;
  state: State;
  integration: {
    providerIdentifier: Identifier;
    picture: string;
  };
};
