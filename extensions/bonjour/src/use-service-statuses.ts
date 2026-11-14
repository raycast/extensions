import { Color } from '@raycast/api'
import { useEffect, useState } from 'react'
import { getStatus, HttpService } from './service'

export function useServiceStatuses(services: HttpService[] | undefined) {
  const [statuses, setStatuses] = useState<Record<string, Color>>({})
  const urlsKey = JSON.stringify(
    [...new Set((services ?? []).flatMap(service => [service.url, ...service.urls]))].sort(),
  )

  useEffect(() => {
    let cancelled = false
    const urls: string[] = JSON.parse(urlsKey)

    const refresh = async () => {
      await Promise.all(urls.map(async (url) => {
        const status = await getStatus(url)
        if (!cancelled) {
          setStatuses(previous => ({ ...previous, [url]: status }))
        }
      }))
    }

    void refresh()
    const interval = setInterval(() => void refresh(), 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [urlsKey])

  return statuses
}
