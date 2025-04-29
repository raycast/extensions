export type RaycastWallpaper = {
  title: string;
  url: string;
};

export type AppearancedWallpaper = {
  title: string;
  appearance: string;
};

export type RaycastWallpaperWithInfo = {
  title: string;
  url: string;
  exclude: boolean;
  appearance: string;
};
