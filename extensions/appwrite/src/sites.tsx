import { useCachedPromise } from "@raycast/utils";
import { List } from "@raycast/api";
import { useContext } from "react";
import { SDKContext } from "./sdk";

export default function Sites() {
  const sdks = useContext(SDKContext);
  const { isLoading, data: sites } = useCachedPromise(
    async () => {
      const res = await sdks.sites.list();
      return res.sites;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {sites.map((site) => (
        <List.Item key={site.$id} title={site.name} />
      ))}
    </List>
  );
}
