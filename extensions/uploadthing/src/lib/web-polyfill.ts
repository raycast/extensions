/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetch, FormData, Response, Headers } from "undici";

globalThis.fetch = fetch as any;
globalThis.Response = Response as any;
globalThis.FormData = FormData as any;
globalThis.Headers = Headers as any;
