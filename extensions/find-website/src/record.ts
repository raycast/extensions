export interface Record {
  id: number;
  url: string;
  title: string;
  visitCount: number;
}

export interface SafariRecord extends Record {
  visitTime: string;
}

export interface FirefoxRecord extends Record {
  lastVisitDate: string;
}

export interface ZenRecord extends FirefoxRecord {}

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
export interface BraveRecord extends ChromeRecord {}
