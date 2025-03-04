import { Image } from "@raycast/api";

export interface Boilerplate {
  slug: string;
  name: string;
  title: string;
  subtitle: string;
  icon: Image.ImageLike;
  shortcut?: { modifiers: string[]; key: string };
  keywords: string[];
}
