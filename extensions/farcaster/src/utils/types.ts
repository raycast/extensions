export type Cast = {
  object: "cast";
  hash: string;
  thread_hash: string;
  parent_hash: string | null;
  parent_url: string;
  root_parent_url?: string;
  author: CastAuthor;
  text: string;
  timestamp: string;
  embeds: CastEmbed[];
  frames: Frame[];
  reactions: {
    likes: CastReaction[];
    recasts: CastReaction[];
  };
  replies: {
    count: number;
  };
};

export type Frame = {
  version: "vNext";
  title: string;
  image: string;
  image_aspect_ratio: string;
  buttons: Button[];
  post_url: string;
  frames_url: string;
};

type Button = {
  index: number;
  title: string;
  action_type: "post" | "post_redirect";
  target: string;
};

export type CastEmbed = { url: string } | { cast_id: EmbeddedCast };

type EmbeddedCast = {
  fid: string;
  hash: string;
};

type CastReaction = {
  fid: number;
  fname: string;
};

export type FeedCastsResponse = {
  casts: Cast[];
  next: {
    cursor: string;
  };
};

export type FeedUsersResponse = {
  result: {
    users: CastAuthor[];
    next: {
      cursor: string;
    };
  };
};

export type CastAuthor = {
  object: "user";
  fid: number;
  bio: string;
  custody_address: string;
  username: string;
  display_name: string;
  pfp_url: string;
  profile: CastProfile;
  follower_count: number;
  following_count: number;
  verifications: string[];
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
  active_status: "active" | "inactive";
  power_badge: boolean;
};

type CastProfile = {
  bio: {
    text: string;
  };
};
