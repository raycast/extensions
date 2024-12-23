export interface CursorMetadata {
  filePath: string;
  svgContent: string;
  categoryName: string;
  timesUsed?: number;
  isFavorited?: boolean;
}

export interface CursorItem {
  id: string;
  name: string;
  path: string;
  content: string;
  category: string;
  isFavorited: boolean;
}

export type CursorCategoryMap = Record<string, Record<string, CursorMetadata>>;
export type CursorUsageStats = Record<string, number>;

export interface SectionFilter {
  id: string;
  title: string;
  value: string;
}

export type FilterState = {
  selectedSection: string;
};
