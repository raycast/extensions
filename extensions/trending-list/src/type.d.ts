export interface TrendingItem {
  id: number;
  title?: string;
  excerpt?: string;
  url: string;
  pic?: string;
  hotvalue: string;
  gettime: number;
  getsort: number;
  source: string;
}

export interface SiteItem {
  key: string;
  name: string;
  updateTime: number;
  icon: string;
  searchtext: string;
  searchstart: string;
  searchend: string;
  link: string;
}

export type SiteConfig = Record<string, SiteItem>;
