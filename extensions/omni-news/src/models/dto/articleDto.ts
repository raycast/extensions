export interface ArticleResponse {
  articles: ArticleDto[][];
}

export interface ArticleDto {
  article_id: string;
  title: { value: string };
  resources?: ArticleResource[];
  category?: { title: string };
  vignette?: { title: string };
  changes: {
    modified: string;
    published: string;
  };
  meta: {
    changes: {
      updated: string;
      last_saved: string;
    };
  };
}

export interface ArticleResource {
  type: string;
  image_asset?: {
    id: string;
  };
  paragraphs?: {
    text: { value: string };
    block_type: string;
  }[];
  vignette?: {
    title: string;
    bullet_color?: {
      red: number;
      green: number;
      blue: number;
    };
  };
}
