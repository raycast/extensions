import type { Color, Icon } from "@raycast/api";

export type QuickActionPreference = "view-styles" | "copy-svg" | "copy-jsx" | "download-svg";

export interface IconMeta {
  name: string;
  tags?: string[] | string;
  category?: string | null;
  styles?: string[];
}

export interface HugeIcon {
  name: string;
  svg: string;
}

export interface IconStyle {
  name: string;
  label: string;
  svg: string | null;
}

export interface ApiMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiResponse {
  success: boolean;
  data: IconMeta[];
  meta: ApiMeta;
}

export interface ColorOption {
  name: string;
  value: string;
  raycastColor?: Color;
}

export interface GridSizeOption {
  name: string;
  value: string;
}

export interface FolderColorOption {
  name: string;
  value: string;
  raycastColor: Color;
}

export interface FolderIconOption {
  name: string;
  value: string;
  icon: Icon;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  icons: HugeIcon[];
}
