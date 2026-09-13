export type GifSource = "klipy" | "local";

export interface GifRendition {
  url: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface GifItem {
  id: string;
  title: string;
  description?: string;
  source: GifSource;
  previewUrl: string;
  originalUrl: string;
  originalSize?: number;
  localPath?: string;
  watchedFolder?: string;
  managedCopy?: boolean;
  renditions?: GifRendition[];
  importedAt?: number;
}
