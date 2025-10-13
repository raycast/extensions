export interface Snippet {
  id: number;
  name: string;
  description: string | null;
  tags: {
    id: number;
    name: string;
  }[];
  folder: {
    id: number;
    name: string;
  } | null;
  contents: {
    id: number;
    label: string;
    value: string | null;
    language: string;
  }[];
  isFavorites: number;
  isDeleted: number;
  createdAt: number;
  updatedAt: number;
}

export interface ListItem {
  id: number;
  name: string;
  snippetName: string;
  description: string;
  detail: string;
  value: string;
  language: string;
}
