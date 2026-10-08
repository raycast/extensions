import { Icon } from "@raycast/api";

export enum Category {
  COMMON,
  DB,
  MIGRATE,
  STUDIO,
}

export type Section = {
  title: string;
  subtitle?: string;
  category: Category;
  tintColor: string;
  icon: Icon;
};

export type PrismaCommand = {
  title: string;
  subtitle: string;
  category: Category;
  copyToClipboard: string;
  detailsMarkdown: string;
};
