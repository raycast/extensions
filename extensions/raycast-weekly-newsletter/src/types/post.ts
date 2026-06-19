export interface SubstackPost {
  id: number;
  title: string;
  slug: string;
  subtitle: string | null;
  post_date: string;
  canonical_url: string;
  cover_image: string | null;
  description: string | null;
  body_html: string;
  reaction_count: number;
  comment_count: number;
  restacks: number;
  audience: "everyone" | "only_paid" | "founding";
  wordcount: number;
  reading_time: number;
}

export interface SubstackApiResponse {
  posts: SubstackPost[];
}

export interface PostStats {
  reaction_count: number;
  comments: number;
  restacks: number;
}
