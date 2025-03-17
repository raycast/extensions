import { Polar } from "@polar-sh/sdk";
import fetch, { Headers, Request, Response } from "node-fetch";

if (!globalThis.fetch) {
  // @ts-expect-error Ensure global
  globalThis.fetch = fetch;
  // @ts-expect-error Ensure global
  globalThis.Headers = Headers;
  // @ts-expect-error Ensure global
  globalThis.Request = Request;
  // @ts-expect-error Ensure global
  globalThis.Response = Response;
}

export const buildPolarClient = (accessToken?: string) => {
  return new Polar({
    accessToken,
  });
};
