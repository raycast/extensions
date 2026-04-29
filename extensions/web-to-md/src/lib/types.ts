export type FileNameStyle = "title-slug" | "date-title-slug";

export type CommandPreferences = {
  outputDirectory?: string;
  fileNameStyle?: FileNameStyle;
  includeFrontmatter?: boolean;
  externalFallbackEnabled?: boolean;
  externalFallbackPrefix?: string;
};

export type CommandArguments = {
  url?: string;
};
