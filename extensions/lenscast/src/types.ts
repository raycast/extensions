export enum PublicationMainFocus {
  Article = "ARTICLE",
  Audio = "AUDIO",
  Embed = "EMBED",
  Image = "IMAGE",
  Link = "LINK",
  TextOnly = "TEXT_ONLY",
  Video = "VIDEO",
}

export type Media = {
  altTag?: string;
  cover?: string;
  url: string;
  mimeType?: string;
};

export type MediaSet = {
  original: Media;
};

export type ProfileData = {
  profileId: string;
  bio: string;
  name: string;
  handle: string;
  picture: {
    original: {
      url: string;
    };
  };
  stats: {
    totalFollowers: string;
    totalFollowing: string;
    totalPosts: string;
    totalComments: string;
    totalMirrors: string;
    totalPublications: string;
    totalCollects: string;
  };
  metadata: string;
};

export type MetadataOutput = {
  __typename?: "MetadataOutput";
  animatedUrl?: string;
  content?: string;
  cover?: MediaSet;
  description?: string;
  image?: string;
  locale?: string;
  mainContentFocus: PublicationMainFocus;
  media: Array<MediaSet>;
  name?: string;
};

export type PublicationStats = {
  id: string;
  totalAmountOfCollects: number;
  totalAmountOfComments: number;
  totalAmountOfMirrors: number;
  totalDownvotes: number;
  totalUpvotes: number;
};

export type Post = {
  appId?: string;
  createdAt: string;
  hasCollectedByMe: boolean;
  hidden: boolean;
  id: string;
  metadata: MetadataOutput;
  onChainContentURI: string;
  profile: ProfileData;
  stats: PublicationStats;
};
