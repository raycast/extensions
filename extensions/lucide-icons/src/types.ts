type IconNode = [elementName: string, attrs: Record<string, string>][];

export type IconNodes = Record<string, IconNode>;

export type LucideIcon = {
  name: string;
  content: string;
  path: string;
  component: string;
  keywords: string[];
};
