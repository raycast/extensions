import { getPreferenceValues } from '@raycast/api'
import { useFetch } from '@raycast/utils'

const baseUrl = 'https://readwise.io/api/v2'

export type Book = {
  cover_image_url: string
  num_highlights: number
  source: string
  author: string
  category: string
  id: string
  title: string
}

export type Highlight = {
  id: number
  text: string
  note: string
  location: string
  updated: string
  color: string
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
