import { showToast, Toast } from '@raycast/api'
import fetch from 'node-fetch'
import { NpmsFetchResponse } from '../npmsResponse.model'

export const fetchPackages = async (
  searchTerm = '',
  signal: AbortSignal,
): Promise<NpmsFetchResponse> => {
  try {
    const response = await fetch(
      `https://api.npms.io/v2/search/suggestions?q=${searchTerm}`,
      { signal },
    )
    const json = await response.json()
    return json as NpmsFetchResponse
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return []
    }

    console.error(error)
    showToast(Toast.Style.Failure, 'Could not fetch packages')
    return Promise.resolve([])
  }
}
