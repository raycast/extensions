import { getAccessToken } from '@raycast/utils'
import { APP_URL } from '../constants/raycast'

export async function fetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = new URL(path, APP_URL).toString()
  const { token } = getAccessToken()
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Request failed: ${res.status} ${text}`)
  }
  return (await res.json()) as T
}
