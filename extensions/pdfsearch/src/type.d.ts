export type Collection = {
  name: string;
  description?: string;
  files: string[];
};

export type Document = {
  content: string;
  page: number;
  file: string;
  score: number;
};
