export interface PostDocument {
  title: string;
  created: Date;
  correspondent: string;
  type: string;
  tags: string[];
  filePaths: string[];
}
