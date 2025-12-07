import { List, Icon } from "@raycast/api";
import { useCachedPromise, getFavicon } from "@raycast/utils";
import { alwaysdata } from "./alwaysdata";

export default function Sites() {
  const { isLoading, data: sites } = useCachedPromise(alwaysdata.sites.list, [], {
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {sites.map((site) => (
        <List.Item
          key={site.id}
          icon={getFavicon(site.addresses[0], { fallback: Icon.Globe })}
          title={site.addresses[0]}
          accessories={[{ tag: site.type }]}
        />
      ))}
    </List>
  );
}
