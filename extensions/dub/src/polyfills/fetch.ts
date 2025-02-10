import { fetch, Headers, Request, Response } from "undici";

if (!Object.keys(global).includes("fetch")) {
  Object.defineProperty(global, "fetch", { value: fetch });
}
if (!Object.keys(global).includes("Headers")) {
  Object.defineProperty(global, "Headers", { value: Headers });
}
if (!Object.keys(global).includes("Request")) {
  Object.defineProperty(global, "Request", { value: Request });
}
if (!Object.keys(global).includes("Response")) {
  Object.defineProperty(global, "Response", { value: Response });
}
