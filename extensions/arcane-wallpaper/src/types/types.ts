export type ArcaneWallpaper = {
  title: string;
  category: string;
  url: string;
  thumbnailUrl?: string;
};

export type ArcaneWallpaperWithInfo = {
  title: string;
  category: string;
  url: string;
  thumbnailUrl?: string;
  exclude: boolean;
};
