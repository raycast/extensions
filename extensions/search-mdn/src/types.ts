export type Result = {
  title: string;
  url: string;
  key: string;
  summary: string;
  mdn_url: string;
};

export type MDNResponse = {
  documents: Array<Result>;
  metadata: { size: number; total: { value: number } };
};

export interface Content {
  content: string;
  encoding: string;
}
