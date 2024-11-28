export type Video = {
  id: string;
  stream_id: string | null;
  user_id: string;
  user_login: string;
  user_name: string;
  title: string;
  description: string;
  created_at: string;
  published_at: string;
  url: string;
  thumbnail_url: string;
  viewable: "public";
  view_count: number;
  language: string;
  type: "archive" | "highlight" | "upload";
  duration: string;
  muted_segments: { duration: number; offset: number }[] | null;
};
