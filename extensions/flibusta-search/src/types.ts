export interface Book {
  title: string;
  author: string;
  url: string;
  formats: {
    epub?: string;
    fb2?: string;
    mobi?: string;
  };
}

export interface OpdsBook {
  title: string;
  author: {
    name: string;
    uri: string;
  };
  categories: Array<{
    term: string;
    label: string;
  }>;
  language: string;
  format: string;
  issued: string;
  description: string;
  coverUrl?: string;
  downloadLinks: {
    fb2?: string;
    epub?: string;
    mobi?: string;
  };
}

export interface OpdsSearchResponse {
  id: string;
  title: string;
  updated: string;
  entries: OpdsBook[];
}

export type SearchStatus = "idle" | "searching" | "found" | "not_found";
