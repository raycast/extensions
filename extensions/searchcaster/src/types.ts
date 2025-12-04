export type CastResponse = {
  casts: Cast[];
};

export type Cast = {
  body: CastBody;
  meta: CastMeta;
  merkleRoot: string;
  uri: string;
};

export type CastBody = {
  publishedAt: number;
  username: string;
  data: {
    text: string;
    image: string | null;
    replyParentMerkleRoot: string | null;
  };
};

export type CastMeta = {
  displayName: string;
  avatar: string;
  isVerifiedAvatar: boolean;
  numReplyChildren: number;
  reactions: {
    count: number;
    type: string;
  };
  recasts: {
    count: number;
  };
  watches: {
    count: number;
  };
  replyParentUsername: {
    username: string;
  };
  mentions: CastMention[] | null;
};

export type CastMention = {
  address: string;
  username: string;
};

export type ActionsProps = {
  cast: Cast;
  farcasterInstalled: boolean;
};

export type CastDetailsProps = {
  cast: Cast;
};

export type Profile = {
  body: {
    id: number;
    address: string;
    username: string;
    displayName: string;
    bio: string | undefined;
    followers: number;
    following: number;
    avatarUrl: string;
    isVerifiedAvatar: boolean;
    registeredAt: number;
  };
  connectedAddress: string;
};

export type ProfileResponse =
  | Profile[]
  | {
      error: string;
    };

export type ProfileActionsProps = {
  profile: Profile;
  farcasterInstalled: boolean;
};
