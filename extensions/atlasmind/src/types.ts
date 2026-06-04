export interface Item {
  id: string;
  type: "url" | "text" | "note";
  content: string;
  title: string;
  tags: string;
  created_at: string;
  og_image?: string;
  og_title?: string;
  og_description?: string;
  body_excerpt?: string;
}
