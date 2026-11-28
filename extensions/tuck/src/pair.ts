/** `tuck://pair?port=47221&token=…` from the Mac menu bar. The host is always loopback. */

export const DEFAULT_LISTENER_PORT = 47221

export type Pair = {
  port: number
  token: string
}

export function parsePairLink(raw: string): Pair | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== "tuck:" || url.hostname.toLowerCase() !== "pair") return null
  const token = url.searchParams.get("token")?.trim() ?? ""
  if (!token || /[\s]/.test(token)) return null
  const portRaw = url.searchParams.get("port")
  if (portRaw == null || portRaw === "") return { port: DEFAULT_LISTENER_PORT, token }
  if (!/^\d+$/.test(portRaw)) return null
  const port = Number(portRaw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null
  return { port, token }
}

export function listenerBase(pair: Pair): string {
  return `http://127.0.0.1:${pair.port}`
}
