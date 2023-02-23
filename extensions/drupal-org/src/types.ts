export interface DrupalChangeRecord {
  created: Date;
  title: string;
  changeVersion: string;
  id: string;
  url: string;
}

export interface SearchChangeRecordsState {
  records?: DrupalChangeRecord[];
  error?: Error;
  loading?: boolean;
}
