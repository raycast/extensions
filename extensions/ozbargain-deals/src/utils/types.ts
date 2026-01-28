export type OzBargainFeedItem = {
  title: string;
  link: string;
  description: string;
  comments?: string;
  category?: string | string[];
  "ozb:meta"?:
    | {
        $?: {
          "comment-count"?: string;
          "votes-pos"?: string;
          "votes-neg"?: string;
          image?: string;
          url?: string;
        };
      }
    | undefined;
  "media:thumbnail"?:
    | {
        $?: {
          url: string;
        };
      }
    | undefined;
  "dc:creator"?: string;
  pubDate: string;
  guid?: string;
};

export type Deal = {
  id: string;
  title: string;
  link: string;
  descriptionHtml: string;
  descriptionMarkdown: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  store: string;
  creator: string;
  pubDate: Date;
  categories: string[];
  imageUrl?: string;
  netVotes: number;
};

export type TurndownNode = {
  getAttribute: (name: string) => string | null;
};
