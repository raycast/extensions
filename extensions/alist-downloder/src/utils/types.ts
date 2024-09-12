export interface AlistItem {
  name: string;
  size: number;
  is_dir: boolean;
  hash: string;
  sign?: string;
  parent?: string;
}

export interface APIResponse {
  data: {
    content: AlistItem[];
  };
}
