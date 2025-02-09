export interface Record {
  id: number;
  url: string;
  title: string;
  visitCount: number;
}

export interface SafariRecord extends Record {
  visitTime: number;
}

export interface OrionRecord extends Record {
  lastVisitTime: string;
  typedCount: number;
  host: string;
}

export interface ChromeRecord extends Record {
  lastVisitTime: string;
  typedCount: number;
  hidden: number;
}

export interface ArcRecord extends ChromeRecord {}
