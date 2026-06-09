export type FmhyRelatedLinkKind =
  | "discord"
  | "fmhy"
  | "github"
  | "gitlab"
  | "reddit"
  | "source"
  | "telegram"
  | "twitter"
  | "website";

export type FmhyRelatedLink = {
  title: string;
  url: string;
  kind?: FmhyRelatedLinkKind;
  group?: string;
};

export type FmhyCategory = {
  name: string;
  url?: string;
  notes?: string[];
};

export type FmhyResult = {
  title: string;
  url: string;
  category?: string;
  categoryUrl?: string;
  description?: string;
  isStarred?: boolean;
  isRedirect?: boolean;
  isIndex?: boolean;
  relatedLinks?: FmhyRelatedLink[];
};

export type FmhyIndex = {
  results: FmhyResult[];
  categories: FmhyCategory[];
};

export type FmhyIndexCache = {
  version: 4;
  timestamp: number;
  index: FmhyIndex;
  isLegacy?: boolean;
};
