export interface TenHotRes {
  code: number;
  msg: string;
  data: Trend[];
}

export interface Trend {
  name: string;
  url: string;
  hot?: string;
}
