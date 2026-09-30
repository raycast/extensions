export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface CorcelRequestProps {
  data?: object;
  url: string;
}
