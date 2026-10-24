export interface Link {
  name: string;
  url: string;
}

export interface FMItem {
  id: string; // generated unique id
  title: string;
  url: string;
  description: string;
  category: string; // e.g. "video" (matches markdown file name)
  subcategory: string; // e.g. "Streaming Sites" (H1 header in markdown)
  section: string; // e.g. "Stream Aggregators" (H2 header in markdown)
  mirrors: string[]; // list of mirror URLs (typically links labeled "2", "3", etc.)
  alternatives: Link[]; // other alternative link objects in the same bullet (e.g. Cineplay, Fmovies+)
  officialLinks: Link[]; // official links associated with the tool (e.g. Discord, Telegram, GitHub)
  starred: boolean; // whether it features a star emoji
  position: number; // original order position on FMHY
}

export interface SearchIndex {
  commitSha: string;
  syncedAt: string;
  items: FMItem[];
}
