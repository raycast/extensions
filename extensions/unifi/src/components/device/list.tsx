import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Site } from "unifi-client";
import { showErrorToast } from "../../utils";

export function SiteDevicesList(props: { site: Site }) {
  const {
    data: clients,
    error,
    isLoading,
  } = useCachedPromise(
    async (site: Site) => {
      const clients = await site.devices.list();
      return clients;
    },
    [props.site],
    { keepPreviousData: true }
  );
  showErrorToast(error);
  return (
    <List isLoading={isLoading}>
      {clients?.map((c) => (
        <List.Item key={c._id} title={c.name || "?"} />
      ))}
    </List>
  );
}
