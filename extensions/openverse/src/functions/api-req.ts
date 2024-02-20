import fetch, { type RequestInit } from "node-fetch"
import { getPreferenceValues, LocalStorage } from "@raycast/api"

import { API_BASE } from "@/constants"

/**
 * Make a request to the Openverse API. This function handles the management of
 * the access token and automatically adds the `Authorization` header to every
 * outgoing request.
 *
 * @param path - the path where to send the request, including a leading slash
 * @param options - the options to pass to the `fetch` function
 * @return the response from the API
 */
export async function apiRequest<T>(path: string, options?: RequestInit) {
  const localStorageData = await LocalStorage.allItems<LocalStorageData>()

  const currTimestamp = Date.now() / 1000
  if (
    !localStorageData.expiresAt ||
    localStorageData.expiresAt <= currTimestamp
  ) {
    // Access token has expired, get a new one from the API.
    const { clientId, clientSecret } = getPreferenceValues<PreferenceData>()
    const { accessToken, expiresIn } = await getAccessToken(
      clientId,
      clientSecret
    )
    await LocalStorage.setItem("accessToken", accessToken)
    await LocalStorage.setItem("expiresAt", currTimestamp + expiresIn)
  }

  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${localStorageData.accessToken}`,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    console.error("Could not complete API request:", await res.text())
    throw new Error(res.statusText)
  }

  return (await res.json()) as T
}

/**
 * Get an access token from the API using the client ID, client secret and the
 * `client_credentials` grant-type. The response also includes the duration for
 * which the token is valid.
 *
 * @param clientId - the client ID of the app from Raycast preferences
 * @param clientSecret - the client secret of the app from Raycast preferences
 * @return the access token and the duration of validity
 */
async function getAccessToken(clientId: string, clientSecret: string) {
  const TOKEN_ENDPOINT = `${API_BASE}/auth_tokens/token/`

  const params = new URLSearchParams()

  params.append("client_id", clientId)
  params.append("client_secret", clientSecret)
  params.append("grant_type", "client_credentials")

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    body: params,
  })
  if (!res.ok) {
    console.error("Could not access token:", await res.text())
    throw new Error(res.statusText)
  }

  const data = (await res.json()) as TokenResponse
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  }
}
