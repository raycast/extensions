/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetch, FormData, Response, Headers } from "undici";
import * as Crypto from "crypto";

globalThis.crypto = Crypto as any;
globalThis.fetch = fetch as any;
globalThis.Response = Response as any;
globalThis.FormData = FormData as any;
globalThis.Headers = Headers as any;
