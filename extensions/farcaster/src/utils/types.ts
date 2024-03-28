export type Cast = {
  object: 'cast';
  hash: string;
  thread_hash: string;
  parent_hash: string | null;
  parent_url: string;
  root_parent_url?: string;
  // parent_author: any; // Define the structure of parent_author object if needed
  author: CastAuthor;
  text: string;
  timestamp: string;
  // embeds: any[]; // Define the structure of embeds object if needed
  frames: any[];
  reactions: {
    likes: CastReaction[];
    recasts: CastReaction[];
  };
  replies: {
    count: number;
  };
  // mentioned_profiles: any[]; // Define the structure of mentioned_profiles object if needed
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
  users: CastAuthor[];
  next: {
    cursor: string;
  };
};

export type CastAuthor = {
  object: 'user';
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
  active_status: 'active' | 'inactive';
  power_badge: boolean;
};

type CastProfile = {
  bio: {
    text: string;
    mentioned_profiles?: any[];
  };
};
