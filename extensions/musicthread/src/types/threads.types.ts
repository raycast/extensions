export type Thread = {
  key: string;
  title: string;
  description?: string;
  author: {
    name: string;
    avatar_url: string;
  };
  tags: string[];
  is_private: boolean;
  page_url: string;
};
