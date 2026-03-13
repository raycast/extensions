export type Result = {
  title: string;
  url: string;
  summary: string;
  mdn_url: string;
};

export type MDNResponse = {
  documents: Array<Result>;
};

export interface Content {
  content: string;
  encoding: string;
}
