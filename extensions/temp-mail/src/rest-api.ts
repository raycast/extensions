import fetch, { Response } from "node-fetch";

const BASE_URL = "https://api.mail.tm";
const HEADERS = { accept: "application/json" };

export type Methods = "GET" | "POST" | "DELETE" | "PATCH";

interface IRequestObject {
  method: Methods;
  headers: {
    accept: string;
    authorization?: string;
    "content-type"?: string;
  };
  body?: string;
}

interface IResult<T> {
  status: boolean;
  message: string;
  data: T;
}

const request = async <T>(
  path: string,
  method: Methods = "GET",
  body?: object,
  token = undefined
): Promise<IResult<T>> => {
  const options: IRequestObject = {
    method,
    headers: HEADERS,
  };

  options.headers = token ? { ...options.headers, authorization: `Bearer ${token}` } : options.headers;

  if (method === "POST" || method === "PATCH") {
    const contentType = method === "PATCH" ? "merge-patch+json" : "json";
    options.headers["content-type"] = `application/${contentType}`;
    options.body = JSON.stringify(body);
  }

  const res: Response = await fetch(BASE_URL + path, options);
  let data;

  const contentType = res.headers.get("content-type");

  if (contentType?.startsWith("application/json")) data = (await res.json()) as T;
  else data = (await res.text()) as T;

  return {
    status: res.ok,
    message: res.ok ? "ok" : data.message || data.detail,
    data,
  };
};

export default request;
