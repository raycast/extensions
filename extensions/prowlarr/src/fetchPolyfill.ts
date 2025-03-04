import fetch, { Headers, Request, Response } from "node-fetch";

if (!globalThis.fetch) {
  globalThis.fetch = fetch as unknown as typeof global.fetch;
  globalThis.Headers = Headers as unknown as typeof global.Headers;
  globalThis.Request = Request as unknown as typeof global.Request;
  globalThis.Response = Response as unknown as typeof globalThis.Response;
}
