import fetch from 'node-fetch'
import { getPreferenceValues, popToRoot, showToast, Toast } from '@raycast/api'
import { URL } from 'url'

type Params = { [key: string]: string | number | undefined }

export class ScalewayAPI {
  private static BASE_URL = 'https://api.scaleway.com'
  private static SECRET_KEY = getPreferenceValues().secretKey

  public static CONSOLE_URL = 'https://console.scaleway.com'

  public static async get<T>(endpoint: string, query: Params = {}): Promise<T> {
    // Build the URL
    const url = new URL(ScalewayAPI.BASE_URL)
    url.pathname = endpoint

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, `${value}`)
    })

    const response = await fetch(url.href, {
      method: 'GET',
      headers: { 'X-Auth-Token': ScalewayAPI.SECRET_KEY, 'Content-Type': 'application/json' },
    })

    if (!response.ok) throw await response.json()
    return (await response.json()) as T
  }

  public static async post(endpoint: string, body: Params = {}) {
    // Build the URL
    const url = new URL(ScalewayAPI.BASE_URL)
    url.pathname = endpoint

    const response = await fetch(url.href, {
      method: 'POST',
      headers: { 'X-Auth-Token': ScalewayAPI.SECRET_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw await response.json()
    }
    return await response.json()
  }
}

export async function catchError(error: unknown, message?: string) {
  if ((error as { message: string })?.message === 'You do not have the permission') {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Invalid Credentials',
      message: 'Check your API token and try again.',
    })
    await popToRoot({ clearSearchBar: true })
    return
  }
  console.error(error)

  await showToast({
    title: message || 'Failed to fetch data',
    style: Toast.Style.Failure,
  })
}
