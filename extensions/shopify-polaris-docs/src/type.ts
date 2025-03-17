export interface DocType {
  section?: {
    sectionTitle: string;
    items: ItemType[];
  };
}

export interface ItemType {
  title: string;
  shortDescription: string;
  category: string;
  keywords: string[];
  previewImg: string;
  path: string;
  content: string;
}
