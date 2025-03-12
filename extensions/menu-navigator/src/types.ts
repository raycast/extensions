import { Application } from "@raycast/api";

export interface MenuItem {
  menu: string;
  shortcut: string;
  modifier: number | null;
  key: string | null;
  glyph: number | null;
  path: string;
  section?: string;
  isSectionTitle?: boolean;
  submenu?: MenuItem[]; // Add submenu support to MenuItem
}

export interface MenuGroup {
  menu: string;
  items: MenuItem[];
}

export interface MenusConfig {
  app: Application;
  menus: MenuGroup[];
  timestamp: string;
}

export interface SectionTypes {
  id: string;
  value: string;
}
