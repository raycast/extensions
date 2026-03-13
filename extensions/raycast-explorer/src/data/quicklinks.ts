import { Icon } from "@raycast/api";

export type Quicklink = {
  id: string;
  name: string;
  description?: string;
  link: string;
  openWith?: string;
  icon?: {
    name?: Icon;
    link?: string;
    invert?: boolean;
  };
  author?: {
    name: string;
    link?: string;
  };
};

export type QuicklinkCategory = {
  name: string;
  slug: string;
  icon: string;
  quicklinks: Quicklink[];
};
