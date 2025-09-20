import { getPreferenceValues } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import { articleQuery } from '../graphql/queries'

const apiUrl = 'https://api-prod.omnivore.app/api/graphql'
const { apiKey } = getPreferenceValues<{ apiKey: string }>()

export function useArticle(username: string, slug: string) {
  return useFetch<{ article: { content: string; id: string } }>(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: articleQuery,
      variables: {
        username,
        slug,
        format: 'markdown',
      },
    }),
    parseResponse: async (response) => {
      const json = await response.json()
      return json.data.article
    },
  })
}
