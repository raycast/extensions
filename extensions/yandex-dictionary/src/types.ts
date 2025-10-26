export type YaDictionaryArgs = {
  query?: string;
  from: string;
  to: string;
};

export type Preferences = {
  apiKey: string;
};

export type YandexLookupResponse = {
  head: Record<string, unknown>;
  def: YandexDefinition[];
  code: number;
  nmt_code?: number;
};

export type YandexDefinition = {
  text: string;
  pos?: string;
  ts?: string;
  tr: YandexTranslation[];
};

export type YandexTranslation = {
  text: string;
  pos?: string;
  gen?: string;
  asp?: string;
  fr: number;
  syn?: YandexTranslation[];
  mean?: { text: string }[];
};

export type HistoryItem = {
  query: string;
  from: string;
  to: string;
  date: string;
};

export enum YandexErrorCode {
  ERR_OK = 200,
  ERR_KEY_INVALID = 401,
  ERR_KEY_BLOCKED = 402,
  ERR_DAILY_REQ_LIMIT_EXCEEDED = 403,
  ERR_TEXT_TOO_LONG = 413,
  ERR_LANG_NOT_SUPPORTED = 501,
}
