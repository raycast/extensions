interface FeedAuthor {
  name: string;
  url: string;
}

interface FeedItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  image: string;
  date_modified: string;
  author: FeedAuthor;
}

interface Feed {
  version: string;
  title: string;
  home_page_url: string;
  description: string;
  icon: string;
  items: FeedItem[];
}

interface GitHubPR {
  number: number;
  title: string;
  html_url: string;
  merged_at: string | null;
  user: {
    login: string;
    html_url: string;
    avatar_url: string;
  };
  labels: { name: string }[];
}

interface GitHubPRFile {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
}

/** Unified item displayed in the list */
interface StoreItem {
  id: string;
  title: string;
  summary: string;
  image: string;
  date: string;
  authorName: string;
  authorUrl: string;
  url: string;
  type: "new" | "updated" | "removed";
  /** For updated extensions: slug used to fetch changelog */
  extensionSlug?: string;
  /** GitHub PR URL for updated extensions */
  prUrl?: string;
  /** Supported platforms */
  platforms?: string[];
  /** Extension version from package.json */
  version?: string;
  /** Extension categories from package.json */
  categories?: string[];
  /** Extension icon filename from package.json */
  extensionIcon?: string;
}

type FilterValue = "all" | "new" | "updated" | "my-updates" | "removed";

export type { FeedAuthor, FeedItem, Feed, GitHubPR, GitHubPRFile, StoreItem, FilterValue };
