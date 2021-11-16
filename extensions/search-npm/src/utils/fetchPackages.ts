import { showToast, ToastStyle } from '@raycast/api'
import fetch from 'node-fetch'
import { NpmsFetchResponse } from '../npmsResponse.model'

export const fetchPackages = async (
  searchTerm = '',
): Promise<NpmsFetchResponse> => {
  try {
    const response = await fetch(
      `https://api.npms.io/v2/search/suggestions?q=${searchTerm}`,
    )
    const json = await response.json()
    return json as NpmsFetchResponse
  } catch (error) {
    console.error(error)
    showToast(ToastStyle.Failure, 'Could not fetch packages')
    return Promise.resolve([])
  }
}
