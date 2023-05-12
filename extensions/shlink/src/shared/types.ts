export interface ShlinkObject {
  shortCode: string;
  shortUrl: string;
  longUrl: string;
  deviceLongUrls: {
    android: string | null;
    ios: string | null;
    desktop: string | null;
  };
  dateCreated: string | null;
  tags: string[];
  meta: {
    validSince: string | null;
    validUntil: string | null;
    maxVisits: number | null;
  };
  domain: string | null;
  title: string | null;
  crawlable: boolean;
  forwardQuery: boolean;
  visitsSummary: {
    total: number;
    nonBots: number;
    bots: number;
  };
  visitsCount: number;
}

export interface ShlinkPagination {
  currentPage: number;
  pagesCount: number;
  itemsPerPage: number;
  itemsInCurrentPage: number;
  totalItems: number;
}
