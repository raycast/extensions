import { fetch, Headers, Request, Response } from "undici";

// @ts-expect-error
global.fetch = fetch;
// @ts-expect-error
global.Headers = Headers;
// @ts-expect-error
global.Request = Request;
// @ts-expect-error
global.Response = Response;
