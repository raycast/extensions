export type TFormat = "jsonp" | "json" | "xml" | "simple";

export type TAction = "shorturl" | "expand" | "url-stats" | "stats" | "db-stats" | "version";

export type TError = {
  message: string;
  errorCode: string | number;
};

export type TCreateShortUrlParams = {
  url: string;
  keyword?: string;
  title?: string;
};
export type TGetStatsParams = {
  limit: string;
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

export type GetStatsResponse = {
  links: {
    [key in `link_${number}`]: {
      shorturl: string;
      url: string;
      title: string;
      timestamp: string;
      ip: string;
      clicks: string;
    };
  };
  stats: {
    total_links: string;
    total_clicks: string;
  };
  statusCode: 200;
  message: "success";
};
