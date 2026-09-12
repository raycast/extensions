export type Link = {
  address: string;
  banned: boolean;
  created_at: string;
  id: string;
  link: string;
  password: boolean;
  target: string;
  description: string;
  updated_at: string;
  visit_count: number;
};

export type CreateLinkRequest = {
  target: string;
  description: string;
  expire_in: string;
  password: string;
  customurl: string;
};

export type Item = {
  name: string;
  value: number;
};
export type StatsItem = {
  stats: {
    browser: Item[];
    os: Item[];
    country: Item[];
    referrer: Item[];
  };
  views: number[];
  total: number;
};
export type LinkStats = {
  lastYear: StatsItem;
  lastDay: StatsItem;
  lastMonth: StatsItem;
  lastWeek: StatsItem;
};

export type PaginatedResult<T> = {
  limit: number;
  skip: number;
  total: number;
  data: T[];
};
