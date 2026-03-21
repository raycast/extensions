export type Result = {
  history?: HistoryItem[];
  scan: Scan;
  tests?: Record<string, Test>;
};
export type HistoryItem = {
  id: number;
  scanned_at: string;
  grade: string;
  score: number;
};
export type Scan = {
  id: number;
  algorithm_version: number;
  scanned_at: string;
  error: null;
  grade: string;
  response_headers?: Record<string, string>;
  score: number;
  status_code: number;
  tests_failed: number;
  tests_passed: number;
  tests_quantity: number;
};

export type Test = {
  expectation: string;
  name: string;
  link: string;
  title: string;
  pass: boolean | null;
  result: string;
  score_description: string;
  recommendation: string;
  score_modifier: number;
  data: unknown;
};
