export type ResendWallpaper = {
  title: string;
  url: string;
};

export type AppearancedWallpaper = {
  title: string;
  appearance: "light" | "dark";
};

export type ResendWallpaperWithInfo = {
  title: string;
  url: string;
  exclude: boolean;
  appearance: "light" | "dark";
};
