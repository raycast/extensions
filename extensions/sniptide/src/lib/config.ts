import { messages } from "./messages"

export const HOSTED = "https://app.sniptide.com"

// A setting the reader has to correct in the extension preferences before anything can work.
export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConfigError"
  }
}

// The base URL for the instance the reader entered. A bare host such as "paste.example.com" gets
// https://, and plain http:// is accepted only for a local instance, as the SDK requires.
export function instanceUrl(value: string | undefined) {
  const raw = value?.trim() ?? ""
  if (!raw) return HOSTED
  let url: URL
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    throw new ConfigError(messages.invalidInstance)
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local))
    throw new ConfigError(messages.invalidInstance)
  if (url.username || url.password) throw new ConfigError(messages.invalidInstance)
  // An address copied from the browser often carries a page path. The API lives at the root.
  return url.origin
}

// The token as the reader pasted it, without the whitespace a copy can add around it.
export function apiToken(value: string | undefined) {
  const token = value?.trim() ?? ""
  if (!token || /\s/.test(token)) throw new ConfigError(messages.invalidToken)
  return token
}
