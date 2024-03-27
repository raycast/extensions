export type TFormat = "jsonp" | "json" | "xml" | "simple";

export type TAction = "shorturl" | "expand" | "url-stats" | "stats" | "db-stats" | "version";

export type TError = {
  message: string;
  errorCode: string | number;
};

export type TCreateShortUrlParams = {
  url: string;
  keyword: string;
  title: string;
};

export type GetCreateShortUrlResponse = {
  status: string;
  code: string;
  message: string;
  errorCode: string;
  statusCode: number;
  url: {
    keyword: string;
    url: string;
    title: string;
    date: string;
    ip: string;
  };
  title: string;
  shorturl: string;
};
