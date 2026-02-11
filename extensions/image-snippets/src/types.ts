export interface ImageSnippet {
  id: string;
  fileName: string;
  name: string;
  keywords: string[];
  pinned: boolean;
  createdAt: string;
}

export interface SnippetsData {
  snippets: ImageSnippet[];
}

export interface Preferences {
  imagesFolder: string;
}
