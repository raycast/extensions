type Article = {
  title: string;
  description: string;
  url: string;
  imageURL: string;
  imageCaption: string;
  publishedAt: string;
  categories: Category[];
};

type Category = {
  id: string;
  name: string;
  type: string;
};

export type { Article, Category };
