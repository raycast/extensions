// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// https://github.com/node-fetch/node-fetch?tab=readme-ov-file#providing-global-access

import fetch, { Headers, Request, Response } from "node-fetch";

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}
