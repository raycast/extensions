import { getPreferenceValues } from '@raycast/api'
import { useFetch } from '@raycast/utils'

const baseUrl = 'https://readwise.io/api/v2'

export type Book = {
  author: string
  category: string
  cover_image_url: string
  highlights_url: string
  id: string
  num_highlights: number
  source: string
  source_url: string | null
  title: string
}

type Tag = {
  id: number
  name: string
}

export type Highlight = {
  color?: string
  highlighted_at?: string | null
  id: number
  location?: string
  location_type?: string
  note?: string
  tags: Tag[]
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

export const useBooks = ({ category }: { category: string }) => {
  const url = new URL(`${baseUrl}/books/`)

  if (category !== 'all') {
    url.searchParams.set('category', category)
  }

  return useFetch<{ results: Book[] }>(url.toString(), getHeaders())
}

export const useBook = (id: string) => {
  return useFetch<Book>(`${baseUrl}/books/${id}`, getHeaders())
}

export const useHighlights = (bookId: string) => {
  const { data, isLoading } = useFetch<{ results: Highlight[] }>(
    `${baseUrl}/highlights?book_id=${bookId}&page_size=1000`,
    getHeaders()
  )

  return { highlights: data?.results.slice().reverse() ?? [], isLoading }
}
