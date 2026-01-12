export interface GoLinkConfig {
  version: number;
  settings?: {
    defaultBrowser?: string;
    defaultProfile?: string; // default browser profile (e.g., "Profile 1" for Chrome)
    showFavicons?: boolean;
  };
  groups: LinkGroup[];
  templates?: LinkTemplate[];
}

export interface LinkGroup {
  name: string; // unique identifier
  title: string; // display title
  icon?: string; // optional icon
  links: Link[];
}

export interface Link {
  title: string;
  url: string;
  keywords?: string[]; // searchable aliases
  icon?: string;
  application?: string; // app name or bundle identifier (e.g., "com.google.Chrome")
  profile?: string; // browser profile name (e.g., "Profile 1", "Work", "Personal")
}

export interface LinkTemplate {
  name: string;
  pattern: string; // URL with {placeholders}
  icon?: string;
}
