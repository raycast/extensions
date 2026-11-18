export interface FormValues {
  original: string;
  modified: string;
}

export interface DiffResult {
  markdown: string;
  fullDiff: string;
  additions: number;
  removals: number;
  originalFormatted: string;
  modifiedFormatted: string;
}
