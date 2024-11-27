export const ReboundRequestMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
} as const;

export type ReboundRequestMethodType = (typeof ReboundRequestMethod)[keyof typeof ReboundRequestMethod];

export const ReboundRequestProtocol = {
  HTTP: "http",
  HTTPS: "https",
} as const;

export type ReboundRequestProtocolType = (typeof ReboundRequestProtocol)[keyof typeof ReboundRequestProtocol];

export type ReboundResponseStatus = {
  code: number;
  message: string;
};

export type ReboundResponse = {
  status: ReboundResponseStatus;

  headers: Record<string, string>;
  body: string;

  created: Date;
};

export type Rebound = {
  id: string;
  favorite: boolean;

  url: URL;
  details: {
    method: ReboundRequestMethodType;
    protocol: ReboundRequestProtocolType;
    hostname: string;
    path: string;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    body?: string;
  };

  responses: ReboundResponse[];

  created: Date;
};

export type Rebounds = Record<string, Rebound>;
