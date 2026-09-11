import { Image } from "@raycast/api";

export interface DocItem {
  title: string;
  url: string;
  section: string;
  orderIndex: number;
  subtitle?: string;
  icon?: Image.ImageLike;
  source: string;
}

export interface SectionInfo {
  name: string;
  pages: string[];
}

export type Category = string;

export interface DocsConfig {
  name: string;
  url: string;
}

export interface StoredDocsConfig extends DocsConfig {
  isVisible: boolean;
}

export interface FolderPage {
  title: string;
  url: string;
  isFolder: boolean;
  section: string;
}

export interface FolderDetailProps {
  folderUrl: string;
  folderTitle: string;
}

export interface ParsedNavigation {
  sections: SectionInfo[];
  docs: DocItem[];
}
