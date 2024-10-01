export interface PreferenceValues {
  memosServerUrl: string;
  memosServerToken: string;
  model: string;
  language: string;
  openAiApiKey?: string;
  openAiBasePath?: string;
}

export type Memo = {
  name: string;
  uid: string;
  content: string;
};

export interface MemoListProps {
  memos: Memo[];
}
