import { Response } from "./response";

export const RequestMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
} as const;

export type RequestMethodType = (typeof RequestMethod)[keyof typeof RequestMethod];

export const RequestProtocol = {
  HTTP: "http",
  HTTPS: "https",
} as const;

export type RequestProtocolType = (typeof RequestProtocol)[keyof typeof RequestProtocol];

export type Request = {
  id: string;
  favorite: boolean;

  url: URL;
  details: {
    method: RequestMethodType;
    protocol: RequestProtocolType;
    hostname: string;
    path: string;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    body?: string;
  };

  responses: Response[];

  created: Date;
};

export type Requests = Record<string, Request>;
