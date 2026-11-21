export type SaveMediaType = "image" | "video";

export type SaveMedia = {
  type: SaveMediaType;
  width: number;
  height: number;
  /** Grid-sized preview, around 420px wide */
  thumbnail: string;
  /** Full-quality image, or MP4 for videos */
  original: string;
};

export type SaveColor = {
  color: string;
  amount: number;
};

export type SaveeUser = {
  id: string;
  username: string;
  name: string;
  url: string;
  avatar_url: string;
};

export type Save = {
  id: string;
  short_id: string;
  url: string;
  name: string;
  source_url: string | null;
  created_at: string;
  is_private: boolean;
  total_saves: number;
  media: SaveMedia;
  detected_aesthetics: string | null;
  colors: SaveColor[];
  /** Present on feed, board and library results, where the author may not be the caller */
  user?: SaveeUser;
};

export type SavesPage = {
  data: Save[];
  next_cursor: string | null;
  has_more: boolean;
};

export type BoardOwnership = "team" | "user";

export type SubBoard = {
  id: string;
  short_id: string;
  name: string;
  slug: string;
  url: string;
  is_private: boolean;
  saves_count: number;
  created_at: string;
  og_image: string | null;
  ownership_type: BoardOwnership;
};

export type Board = SubBoard & {
  sub_boards: SubBoard[];
};

export type Me = SaveeUser & {
  plan: {
    active: boolean;
    tiers: string[];
  };
};

export type RateLimit = {
  policy: string;
  remaining: number;
  resetSeconds: number;
};
