export type OutputFormat =
  "react" | "svg" | "vue" | "svelte" | "tailwind" | "url";
export type SearchStyle =
  "all" | "stroke" | "solid" | "duotone" | "twotone" | "sharp";

export type IconCustomization = {
  size: number;
  color: string;
};

export type Preferences = {
  defaultFormat: OutputFormat;
  tailwindClasses?: string;
  legalOnly?: boolean;
  defaultStyle: SearchStyle;
};

export type ExtensionAccess = {
  email: string;
  product: "raycast";
  tier: "free" | "founder";
  founderNumber: number | null;
  expiresAt: string;
};

export type IconSearchIcon = {
  id: string;
  name: string;
  displayName: string;
  library: string;
  libraryName: string;
  npmPackage?: string;
  license?: string;
  licenseUrl?: string;
  legalSafe: boolean;
  sourceUrl?: string;
  svgUrl: string;
  previewUrls: string[];
  reactImport?: string;
  reactUsage?: string;
  tags: string[];
};

export type SearchResult = {
  icons: IconSearchIcon[];
  total: number;
  page: number;
  totalPages: number;
  iconifySets: string[];
};
