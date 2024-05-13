export type GithubContentMeta = {
  name: string;
  download_url: string;
  path: string;
};

export type LocalTheme = {
  /**
   * filename with extension
   */
  basename: string;
  /**
   * filename with no extension
   */
  filename: string;
  path: string;
};

export type ExternalTheme = LocalTheme & {
  downloadUrl: string;
  displayName: string;
  imageUrl: string;
};

export type AlacrittyConfig = {
  import: null | string[];
};
