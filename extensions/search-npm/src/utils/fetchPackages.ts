import { showToast, Toast } from '@raycast/api'
import fetch from 'node-fetch'
import { NpmsFetchResponse } from '../npmsResponse.model'

let controller

export const fetchPackages = async (
  searchTerm = '',
): Promise<NpmsFetchResponse> => {
  controller = new AbortController()
  const signal = controller.signal
  try {
    const response = await fetch(
      `https://api.npms.io/v2/search/suggestions?q=${searchTerm}`,
      { signal },
    )
    const json = await response.json()
    return json as NpmsFetchResponse
  } catch (error) {
    console.error(error)
    showToast(Toast.Style.Failure, 'Could not fetch packages')
    return Promise.resolve([])
  }
}
