// Define preferences interface for type safety
export type Preferences = {
  itemLimit: string; // Stored as string, will be parsed to number
};

// Define the structure that matches the actual OzBargain RSS feed
export type OzBargainFeedItem = {
  title: string;
  link: string;
  description: string;
  comments?: string;
  category?: string | string[];
  "ozb:meta"?: {
    $: {
      "comment-count"?: string;
      "votes-pos"?: string;
      "votes-neg"?: string;
      image?: string;
      url?: string;
    };
  };
  "media:thumbnail"?: {
    $: {
      url: string;
    };
  };
  "dc:creator"?: string;
  pubDate: string;
  guid?: string;
};

// Define the structured data for a deal after parsing
export type Deal = {
  id: string;
  title: string;
  link: string;
  descriptionHtml: string; // Raw HTML description from feed, sanitized for security
  descriptionMarkdown: string; // HTML converted to Markdown
  upvotes: number;
  downvotes: number;
  comments: number;
  store: string;
  creator: string;
  pubDate: Date;
  categories: string[];
  imageUrl?: string; // Optional main image
  netVotes: number; // upvotes - downvotes
};

// Type for TurndownService node elements
export type TurndownNode = {
  getAttribute: (name: string) => string | null;
};
