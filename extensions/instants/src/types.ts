export interface Sound {
  id: string;
  name: string;
  slug: string;
  soundUrl: string;
  pageUrl: string;
  color?: string;
  /** Local file path after download (when added to favorites with "download" enabled). */
  localPath?: string;
}
