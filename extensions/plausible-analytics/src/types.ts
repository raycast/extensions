export type Stats = {
  visits: { value: number };
  visitors: { value: number };
  bounce_rate: { value: number };
  visit_duration: { value: number };
  pageviews: { value: number };
};

export type StatsQueryResponse = {
  error?: string;
  results?: Stats;
};
