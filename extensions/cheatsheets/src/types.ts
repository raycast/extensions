export interface File {
  path: string;
  mode: string;
  type: "tree" | "blob";
  sha: string;
  size: number;
  url: string;
}

export interface ListResponse {
  sha: string;
  url: string;
  tree: File[];
}

export interface SheetProps {
  slug: string;
}
