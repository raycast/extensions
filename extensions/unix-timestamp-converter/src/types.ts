/**
 * 国情報
 */
export type Country = {
  id: string;
  name: string;
  timezoneOffset: number; // UTCからのオフセット（例: 9）
  timezoneName: string;
  ianaTimeZone: string;
};

/**
 * 日時フォーマット
 */
export type Format = {
  id: string;
  name: string;
  /**
   * 日付と国情報から表示用文字列を生成する関数
   */
  format: (date: Date, country: Country) => string;
};

/**
 * convert-timestampコマンド用フォーム値
 */
export type ConvertTimestampFormValues = {
  unixTime: string;
  country: string;
  format: string;
};

/**
 * generate-timestampコマンド用フォーム値
 */
export type GenerateTimestampFormValues = {
  country: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};
