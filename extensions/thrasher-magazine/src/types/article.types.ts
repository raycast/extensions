interface ArticleItem {
  id: string;
  created?: string;
  title: string;
  introtext: string;
  fulltext?: string;
  imageToUse: string;
  imageAlt?: string;
  link: string;
}

export type { ArticleItem };
