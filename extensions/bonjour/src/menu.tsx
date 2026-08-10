import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { cache, HttpService, KEY } from "./service";

HttpService.fetch();
export default function Command() {
  const [items, setItems] = useCachedState<HttpService[]>(KEY);

  const set = () => {
    setItems(HttpService.services);
  };

  setTimeout(set, 3 * 1000);
  cache.subscribe(set);

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
                tintColor: service.host.status,
              }}
              onAction={() => {
                open(service.origin);
              }}
            />
          );
        })
      )}
    </MenuBarExtra>
  );
}
