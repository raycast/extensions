import { MenuBarExtra, open } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { cache, HttpService, KEY } from "./service";

HttpService.fetch();
export default function Command() {
  const [items, setItems] = useCachedState<HttpService[]>(KEY);

  cache.subscribe(() => {
    setItems(HttpService.services);
  });

  return (
    <MenuBarExtra
      isLoading={!items}
      icon="menubar_icon.svg"
      tooltip="View local services"
    >
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
