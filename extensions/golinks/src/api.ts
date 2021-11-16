import { showToast, ToastStyle, getPreferenceValues } from '@raycast/api'
import { URLSearchParams } from 'url'
import useSWR from 'swr'
import axios, { AxiosError } from 'axios'
import { GoLink } from './types'

interface Preferences {
  token: string
}

interface FetchResult<T> {
  data: T | undefined
  isLoading: boolean
  error?: AxiosError
}

const preferences: Preferences = getPreferenceValues()

export const api = axios.create({
  baseURL: 'https://api.golinks.io',
  headers: {
    Authorization: `Bearer ${preferences.token}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
})

const fetcher = (path: string) => api.get(path).then((res) => res.data)

export function useFetch<T>(path: string): FetchResult<T> {
  const { data, error } = useSWR<T, AxiosError>(path, fetcher)

  return { data, isLoading: !error && !data, error: error }
}

export async function createGoLink(name: string, url: string, description: string): Promise<AxiosError | void> {
  const params = new URLSearchParams()
  params.append('name', name)
  params.append('url', url)
  params.append('description', description)

  await api.post<GoLink>('/golinks', params)
}
