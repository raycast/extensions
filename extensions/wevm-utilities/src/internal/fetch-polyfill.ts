import fetch, { Headers, Request, Response } from 'node-fetch'

if (!globalThis.fetch) {
  // @ts-expect-error - dw 'bout it
  globalThis.fetch = fetch
  // @ts-expect-error - dw 'bout it
  globalThis.Headers = Headers
  // @ts-expect-error - dw 'bout it
  globalThis.Request = Request
  // @ts-expect-error - dw 'bout it
  globalThis.Response = Response
}
