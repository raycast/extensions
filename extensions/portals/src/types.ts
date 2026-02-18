export interface FolderNode {
  id: string;
  name: string;
  url: string;
  description?: string;
  showDescription?: boolean;
  pinned?: boolean;
  children?: FolderNode[];
}
