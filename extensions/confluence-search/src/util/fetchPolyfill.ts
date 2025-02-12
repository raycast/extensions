/* eslint-disable no-var */
// Modified version of the global polyfill to support how
// apollo-link-rest tries to resolve imports https://github.com/apollographql/apollo-link-rest/issues/222
// Polyfill is described in the node-fetch docs: https://github.com/node-fetch/node-fetch#providing-global-access
import { Headers as FetchHeaders, Request as FetchRequest, Response as FetchResponse } from "node-fetch";

declare global {
  var Headers: typeof FetchHeaders;
  var Request: typeof FetchRequest;
  var Response: typeof FetchResponse;
}

if (!globalThis.Headers) {
  globalThis.Headers = FetchHeaders;
  globalThis.Request = FetchRequest;
  globalThis.Response = FetchResponse;
}
