import { fetch, Headers, Request, Response } from "undici";

// @ts-expect-error - Polyfilling global fetch with undici implementation
global.fetch = fetch;
// @ts-expect-error - Polyfilling global Headers with undici implementation
global.Headers = Headers;
// @ts-expect-error - Polyfilling global Request with undici implementation
global.Request = Request;
// @ts-expect-error - Polyfilling global Response with undici implementation
global.Response = Response;
