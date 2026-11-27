export interface File {
  name: string;
  path: string;
  /** Name of the top-level subfolder of the wallpaper folder; undefined for images directly in it. */
  category?: string;
}
