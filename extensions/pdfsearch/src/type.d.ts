export type Collection = {
  name: string;
  description?: string;
  files: string[];
};

export type Document = {
  id: number;
  content: string;
  page: number;
  file: string;
  score: number;
  lower: number;
  upper: number;
};
