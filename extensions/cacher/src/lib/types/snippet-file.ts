export interface SnippetFile {
  id: number;
  guid: string;
  filename: string;
  filetype: string;
  content: string;
  contentLength: number;
  isShared: boolean;
  snippetFileOrder: number;
  createdAt: string;
  updatedAt: string;
}
