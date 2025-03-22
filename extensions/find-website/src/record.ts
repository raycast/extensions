export interface Record {
  id: number;
  url: string;
  title: string;
  visitCount: number;
  typedCount: number;
  lastVisitTime: string;
}

export interface OrionRecord extends Record {
  host: string;
}

export interface ChromeRecord extends Record {
  hidden: number;
}

export interface ArcRecord extends ChromeRecord {}
