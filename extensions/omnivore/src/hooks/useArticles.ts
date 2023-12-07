import { getPreferenceValues } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import { searchArticlesQuery } from '../graphql/queries'
import { Article } from '../types'

const apiUrl = 'https://api-prod.omnivore.app/api/graphql'
const { apiKey } = getPreferenceValues<{ apiKey: string }>()

/**
 * Custom hook for fetching articles based on search criteria.
 *
 * @param {string} searchType - The type of search (e.g., "in:inbox", "in:archive").
 * @param {string} searchText - The text to search for.
 */
export function useArticles(searchType: string, searchText: string) {
  const { data, error, revalidate } = useFetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: searchArticlesQuery,
      variables: {
        query: `${searchType}`,
      },
    }),
    parseResponse: async (response) => {
      const json = await response.json()
      return json.data
    },
    keepPreviousData: true,
  })

  const transformedData = data?.search?.edges?.map((edge: { node: Article }) => edge.node) || []
  const filteredData = transformedData.filter((article: Article) => {
    const titleMatch = article?.title?.toLowerCase().includes(searchText.toLowerCase())
    const authorMatch = article?.author?.toLowerCase().includes(searchText.toLowerCase())
    const labelsMatch = article?.labels?.some((label) => label.name.toLowerCase().includes(searchText.toLowerCase()))

    return titleMatch || authorMatch || labelsMatch
  })

  return {
    data: filteredData as Article[],
    error,
    revalidate,
  }
}
