import { Image } from "@raycast/api";

export interface Root {
  groups: Record<string, Group>;
  urls: Record<string, Url>;
  templates: Record<string, Template>;
  templateGroups?: Record<string, TemplateGroup>;
}

export interface Templateable {
  templatePlaceholders?: Record<string, string>;
  appliedTemplates?: string[];
  appliedTemplateGroups?: string[];
  tags: string[];
}

export interface Group extends Templateable {
  title?: string;
  linkedUrls: string[];
  otherUrls: Record<string, OtherUrl>;
  icon?: string;
}

export interface Url extends Templateable {
  title?: string;
  url: string;
  icon: string;
  openIn?: string;
}

export interface Template {
  title?: string;
  templateUrl: string;
  icon?: string;
  openIn?: string;
  type?: string;
  tags?: string[];
}

export interface TemplateGroup {
  appliedTemplates: string[];
}

export interface OtherUrl {
  title?: string;
  url: string;
  icon: string;
  tags?: string[];
  openIn?: string;
}

export interface DisplayUrl {
  key: string;
  title: string;
  url: string;
  subtitle: string;
  keywords: string[];
  icon?: string | Image.ImageLike;
  tags: string[];
  openIn?: string;
}

export interface Preferences {
  jsonFilePath: string;
}
