import { Icon, MenuBarExtra, open } from '@raycast/api'
import { useCachedState } from '@raycast/utils'
import { useEffect } from 'react'
import { cache, Http, HttpService, KEY } from './service'
import { useServiceStatuses } from './use-service-statuses'

Http.fetch()
export default function Command() {
  const [items, setItems] = useCachedState<HttpService[]>(KEY)
  const statuses = useServiceStatuses(items)

  useEffect(() => {
    const set = () => setItems(Http.services)
    const interval = setInterval(set, 3000)

    const unsubscribe = cache.subscribe(set)
    set()

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [setItems])

  return (
    <MenuBarExtra icon="menubar_icon.png" tooltip="View local services">
      {!items ? (
        <MenuBarExtra.Item title="loading..." />
      ) : !items.length ? (
        <MenuBarExtra.Item title="No services found" />
      ) : (
        items.map((service: HttpService, index: number) => {
          return (
            <MenuBarExtra.Item
              key={index}
              title={service.name}
              icon={{
                source: Icon.CircleFilled,
                tintColor: statuses[service.url],
              }}
              onAction={() => {
                open(service.url)
              }}
            />
          )
        })
      )}
    </MenuBarExtra>
  )
}
