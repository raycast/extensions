import { showToast, Toast } from '@raycast/api'
import fetch from 'node-fetch'
import { NpmObject, NpmSearchFetchResponse } from '../npmResponse.model'

export const fetchPackages = async (
  searchTerm = '',
  signal: AbortSignal,
): Promise<NpmObject[]> => {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${searchTerm}`,
      { signal },
    )
    const json = (await response.json()) as NpmSearchFetchResponse
    return json.objects
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return []
    }

    console.error(error)
    showToast(Toast.Style.Failure, 'Could not fetch packages')
    return Promise.resolve([])
  }
}
