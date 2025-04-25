import { ColorOption } from "../features/tag/colors";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Page {
  url: string;
  title: string;
  description: string;
  imageUrl: string;
  faviconUrl: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  isRead: boolean;
}

export interface TagWithColor extends Tag {
  colorOption: ColorOption;
}
