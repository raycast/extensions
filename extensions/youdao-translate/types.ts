export interface translateResult {
  requestId: string;
  query: string;
  translation?: Array<string>;
  isWord: boolean;
  basic?: { phonetic?: string; explains?: Array<string> };
  l: string;
  web?: Array<translateWebResult>;
  webdict?: { url: string };
  errorCode: string;
}

export interface translateWebResult {
  value: Array<string>;
  key: string;
}
