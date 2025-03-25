export type StoredCode = {
  slug: string;
  content: string;
  date: Date;
  language?: string;
};

export type CodeCheckResponse = {
  timestamp: number;
  size: number;
};

export interface SMCFormValues {
  slug: string;
  content: string;
}
