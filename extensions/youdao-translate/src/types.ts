export interface TranslateResult {
  requestId: string;
  query: string;
  translation?: Array<string>;
  isWord: boolean;
  basic?: { phonetic?: string; explains?: Array<string> };
  l: string;
  web?: Array<TranslateWebResult>;
  webdict?: { url: string };
  errorCode: string;
}

export interface TranslateWebResult {
  value: Array<string>;
  key: string;
}
