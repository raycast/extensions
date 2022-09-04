export type Response = {
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
