export type RaycastWallpaper = {
  title: string;
  url: string;
};

export type AppearancedWallpaper = {
  title: string;
  appearance: "light" | "dark";
};

export type RaycastWallpaperWithInfo = {
  title: string;
  url: string;
  exclude: boolean;
  appearance: "light" | "dark";
};
