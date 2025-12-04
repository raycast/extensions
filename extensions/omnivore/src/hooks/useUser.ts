import { getPreferenceValues } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import { userQuery } from '../graphql/queries'
import { User } from '../types'

const apiUrl = 'https://api-prod.omnivore.app/api/graphql'
const { apiKey } = getPreferenceValues<{ apiKey: string }>()

export function useUser() {
  return useFetch<User>(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: userQuery,
    }),
    parseResponse: async (response) => {
      const json = await response.json()
      return json.data.me
    },
    keepPreviousData: true,
  })
}
