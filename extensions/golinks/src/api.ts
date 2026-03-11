import { getPreferenceValues } from '@raycast/api'
import { useEffect, useRef, useState } from 'react'
import { GoLink } from './types'

interface Preferences {
  hostname: string
}

interface FetchResult {
  data: GoLink[] | undefined
  isLoading: boolean
  error?: Error
}

function getBaseURL(): string {
  const preferences: Preferences = getPreferenceValues()
  const host = preferences.hostname || 'go'
  return `http://${host}`
}

export function useGoLinks(): FetchResult {
  const [data, setData] = useState<GoLink[] | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const didFetch = useRef(false)

  useEffect(() => {
    if (didFetch.current) return
    didFetch.current = true

    const baseURL = getBaseURL()

    fetch(`${baseURL}/.export`, {
      headers: { 'Sec-Golink': 'raycast' },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        const text = await res.text()
        const links: GoLink[] = text
          .trim()
          .split('\n')
          .filter((line) => line.length > 0)
          .map((line) => JSON.parse(line) as GoLink)
        setData(links)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        setError(err)
        setIsLoading(false)
      })
  }, [])

  return { data, isLoading, error }
}

export async function createGoLink(short: string, long: string): Promise<void> {
  const baseURL = getBaseURL()

  const params = new URLSearchParams()
  params.append('short', short)
  params.append('long', long)

  const res = await fetch(baseURL + '/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Sec-Golink': 'raycast',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body}`)
  }
}
