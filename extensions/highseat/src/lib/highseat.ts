import { OAuth } from "@raycast/api"
import { OAuthService } from "@raycast/utils"
import { createApi } from "highseat/api"
import { createHash } from "node:crypto"

type Method = "get" | "post" | "patch" | "delete"
type Call = (path: string, options: object) => Promise<unknown>
type FetchInput = Parameters<typeof fetch>[0]

export const APP_URL = "https://app.highseat.com"

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Highseat",
  providerIcon: "icon.png",
  description: "Connect your Highseat account",
})

export const highseat = new OAuthService({
  client,
  clientId: "https://api.highseat.com/.well-known/oauth-client-metadata/raycast.json",
  scope: "read offline_access",
  authorizeUrl: `${APP_URL}/api/auth/oauth2/authorize`,
  tokenUrl: `${APP_URL}/api/auth/oauth2/token`,
  bodyEncoding: "url-encoded",
})

/** The API runs five calls at once per workspace, so this leaves room for the dashboard and the menu bar. */
const MAX_RUNNING_CALLS = 3

/** A refusal for too many calls at once asks for a short wait. One for the hourly budget does not. */
const MAX_RETRY_SECONDS = 5
const MAX_RETRIES = 3

const waiting: (() => void)[] = []
let running = 0

async function acquireSlot() {
  while (running >= MAX_RUNNING_CALLS) await new Promise<void>(resolve => waiting.push(resolve))
  running += 1
}

function releaseSlot() {
  running -= 1
  waiting.shift()?.()
}

/** A refused call never ran, so sending it again is safe for a write too. */
async function fetchWithRetry(input: FetchInput, init?: RequestInit, retries = MAX_RETRIES) {
  const response = await fetch(input, init)
  const seconds = Number(response.headers.get("Retry-After"))
  if (response.status !== 429 || retries === 0 || !seconds || seconds > MAX_RETRY_SECONDS) return response

  await new Promise(resolve => setTimeout(resolve, seconds * 1000))
  return fetchWithRetry(input, init, retries - 1)
}

async function queuedFetch(input: FetchInput, init?: RequestInit) {
  await acquireSlot()
  try {
    return await fetchWithRetry(input, init)
  } finally {
    releaseSlot()
  }
}

export const api = createApi({ token: () => highseat.authorize(), fetch: queuedFetch })

/**
 * A call whose route or body is only known at run time, as an AI tool's is. The API validates every
 * argument, so a wrong one comes back as its own error for the model to read. A model can repeat a
 * save, so a create is keyed by its content, and the API answers a repeat within a day with the
 * first row.
 */
export function request(method: Method, path: string, options: object) {
  const content = JSON.stringify([path, options])
  const idempotencyKey = method === "post" ? createHash("sha256").update(content).digest("hex") : undefined
  return (api[method] as unknown as Call)(path, { ...options, idempotencyKey })
}

/** Whether a person has connected, without starting a sign-in. */
export async function isConnected() {
  return Boolean(await client.getTokens())
}

/** Forgets the connection, so the next call opens the picker again. */
export async function disconnect() {
  await client.removeTokens()
}
