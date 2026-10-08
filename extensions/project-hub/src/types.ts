export type Color = "#FF3B30" | "#FF9500" | "#FFCC00" | "#34C759" | "#007AFF" | "#AF52DE" | "#FF2D55" | "#8E8E93";

export interface Project {
  id: string;
  title: string;
  subtitle?: string;
  color?: Color;
  usageCount?: number;
  lastUsed?: string;
}

export interface ProjectLink {
  id: string;
  projectId: string;
  title: string;
  url: string;
}
