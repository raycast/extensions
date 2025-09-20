/* eslint-disable @typescript-eslint/ban-ts-comment */
import fetch, { Headers, Request, Response } from "node-fetch";

// Just import this file to get fetch polyfill like so:
//
// import "../helpers/fetch-polyfill";
//

if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = fetch;
  // @ts-ignore
  globalThis.Headers = Headers;
  // @ts-ignore
  globalThis.Request = Request;
  // @ts-ignore
  globalThis.Response = Response;
}
