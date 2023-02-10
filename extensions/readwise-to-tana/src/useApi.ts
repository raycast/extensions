import { getPreferenceValues } from '@raycast/api'
import { useFetch } from '@raycast/utils'

const baseUrl = 'https://readwise.io/api/v2'

export type Book = {
  author: string
  category: string
  cover_image_url: string
  id: string
  num_highlights: number
  source: string
  title: string
}

export type Highlight = {
  color?: string
  highlighted_at?: string | null
  id: number
  location?: string
  location_type?: string
  note?: string
  text: string
  updated: string
  url?: string | null
}

type Preferences = {
  readonly readwiseToken: string
}

const getHeaders = () => {
  const preferences = getPreferenceValues<Preferences>()

  return {
    headers: {
      Authorization: `Token ${preferences.readwiseToken}`,
    },
  }
}

export const useBooks = () => {
  return useFetch<{ results: Book[] }>(`${baseUrl}/books/`, getHeaders())
}

export const useBook = (id: string) => {
  return useFetch<Book>(`${baseUrl}/books/${id}`, getHeaders())
}

export const useHighlights = (bookId: string) => {
  const { data, isLoading } = useFetch<{ results: Highlight[] }>(
    `${baseUrl}/highlights?book_id=${bookId}`,
    getHeaders()
  )

  return { highlights: data?.results ?? [], isLoading }
}
