import { Blob } from 'node:buffer'
import {
  File,
  FormData,
  Request,
  Response,
  Headers as _Headers,
  fetch,
} from 'undici'

export const useInit = (Comp: React.FC) => {
  const globals: any = globalThis
  // Fetch
  if (!globals.fetch) {
    globals.fetch = fetch
    globals.Headers = _Headers
    globals.Request = Request
    globals.Response = Response
  }

  if (!globals.FormData) {
    globals.File = File
    globals.Blob = Blob
    globals.FormData = FormData
  }

  return Comp
}
