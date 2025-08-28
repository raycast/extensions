type FrontmatterValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | FrontmatterValue[]
  | { [key: string]: FrontmatterValue };

export interface ObsidianNote {
  id: string;
  title: string;
  path: string;
  vault: string;
  frontmatter: Record<string, FrontmatterValue>;
  lastModified: Date;
}

export interface NoteWithUrl extends ObsidianNote {
  url: string;
  urlSource: string; // The frontmatter property that contains the URL
}

export interface GroupedNote {
  id: string; // Same as path, used as unique identifier
  title: string;
  path: string;
  vault: string;
  frontmatter: Record<string, FrontmatterValue>;
  lastModified: Date;
  urls: Array<{
    url: string;
    source: string;
  }>;
  frecencyScore?: number;
  frecencyBucket?: number;
}

export interface Preferences {
  urlProperties: string[]; // Array of frontmatter properties to check for URLs
  scanInterval: number; // How often to scan for changes (in minutes)
  excludeFolders: string[]; // Folders to exclude from scanning
  useFrecency?: boolean; // Use frecency-based sorting instead of alphabetical
}

export interface CommandProps {
  property?: string;
  title?: string;
}
