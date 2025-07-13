export type Media = {
  raw: {
    uri: string;
  };
};

type MediaSet =
  | {
      image: Media;
    }
  | {
      video: Media;
    };

export type ProfileData = {
  profileId: string;
  handle: {
    fullHandle: string;
    localName: string;
  };
  stats: {
    totalFollowers: string;
    totalFollowing: string;
    totalPosts: string;
    totalComments: string;
    totalPublications: string;
    totalMirrors: string;
    // totalCollects: string;
  };
  metadata: {
    bio: string | null;
    displayName: string;
    picture: Media;
  } | null;
};

export type MetadataOutput = {
  content?: string;
  asset?: MediaSet;
  attachments: Array<MediaSet>;
  rawURI?: string;
};

export type PublicationStats = {
  id: string;
  bookmarks: number;
  comments: number;
  mirrors: number;
  upvotes: number;
};

export type Post = {
  createdAt: string;
  id: string;
  metadata: MetadataOutput;
  stats: PublicationStats;
};
