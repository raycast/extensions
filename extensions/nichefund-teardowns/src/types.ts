export type Teardown = {
  slug: string;
  title: string;
  category: string;
  score: number;
  excerpt: string;
  published_at: string;
  url: string;
};

export type TeardownResponse = {
  results: Teardown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
  };
};

export type BusinessIdea = {
  title: string;
  category: string;
  score: number;
  summary: string;
  target_audience: string | null;
  is_b2c: boolean;
};

export type RandomIdeaResponse = {
  idea: BusinessIdea;
};
