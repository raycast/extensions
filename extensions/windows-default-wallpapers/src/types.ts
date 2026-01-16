export interface Wallpapers {
  windows: WallpaperGroup;
  zoomed: WallpaperGroup;
  touchKeyboard: WallpaperGroup;
  capturedMotion: WallpaperGroup;
  flow: WallpaperGroup;
  glow: WallpaperGroup;
  sunrise: WallpaperGroup;
}

export interface WallpaperGroup {
  name: string;
  items: Wallpaper[];
}

export interface Wallpaper {
  name: string;
  path: string;
}
