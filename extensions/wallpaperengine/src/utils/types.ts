export interface WallpaperInfo {
  id: string;
  title: string;
  type: string;
  filePath: string;
  source: "workshop" | "local";
}

export interface MonitorInfo {
  index: number;
  name: string;
  width: number;
  height: number;
}
