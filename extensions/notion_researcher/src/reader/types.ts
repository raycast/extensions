export type ReaderRequestBody = {
  category?: string;
  url: string;
  tags: string[];
  title: string;
  summary: string;
  author: string;
  published_at: string;
};

export type ReaderResponse = {
  id: string;
  url: string;
};
