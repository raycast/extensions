export type MaterialStyle = "filled" | "outlined" | "rounded" | "sharp" | "two-tone";

export type IconEntry = {
  name: string;
  rawName?: string;
  version?: string;
  keywords: string[];
  docsUrl: string;
  styles: MaterialStyle[];
  importStatements: Partial<Record<MaterialStyle, string>>;
  paths?: Partial<Record<MaterialStyle, string>>;
  svg?: string;
};

export type MaterialIconDefinition = {
  name: string;
  componentName: string;
  svg: string;
  keywords: string[];
  styles?: MaterialStyle[];
};

export type MaterialIconMetadata = {
  name: string;
  tags?: string[];
  categories?: string[];
  aliases?: { name: string }[];
  styles?: MaterialStyle[];
  version?: string;
};
