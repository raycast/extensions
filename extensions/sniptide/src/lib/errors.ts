import { SniptideError } from "@sniptide/sdk"
import { ConfigError } from "./config"
import { messages } from "./messages"

export interface Failure {
  message: string
  // True when the fix is in the extension preferences, so the toast can offer to open them.
  preferences: boolean
}

// The sentence to show for a failure. Sniptide's own errors already say what went wrong.
export function describe(error: unknown): Failure {
  if (error instanceof ConfigError) return { message: error.message, preferences: true }
  if (error instanceof SniptideError) {
    if (error.code === "network_error" || error.code === "redirect")
      return { message: messages.unreachable, preferences: true }
    if (error.status === 401) return { message: messages.tokenRejected, preferences: true }
    if (error.status === 403) return { message: messages.readOnly, preferences: true }
    if (error.status === 429) return { message: messages.rateLimited, preferences: false }
    if (error.code === "invalid_response")
      return { message: messages.unreachable, preferences: true }
    if (error.status) return { message: error.message, preferences: false }
  }
  // The SDK's constructor throws a TypeError for a token or address it can't use.
  if (error instanceof TypeError && /token/i.test(error.message))
    return { message: messages.invalidToken, preferences: true }
  return { message: messages.unexpected, preferences: false }
}
