import { Icon, MenuBarExtra } from '@raycast/api'
import { useCachedState } from '@raycast/utils'
import { cache, Http, HttpService, KEY } from './service'

Http.fetch()
export default function Command() {
  const [items, setItems] = useCachedState<HttpService[]>(KEY)

  const set = () => {
    setItems(Http.services)
  }

  setTimeout(set, 3 * 1000)
  cache.subscribe(set)

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
                tintColor: service.origin.status,
              }}
              onAction={service.origin.open}
            />
          )
        })
      )}
    </MenuBarExtra>
  )
}
