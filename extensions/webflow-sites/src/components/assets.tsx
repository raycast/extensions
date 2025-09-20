import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getWebflowClient } from "../oauth";
import { onError } from "../utils";

export default function Assets({ siteId }: { siteId: string }) {
  const webflow = getWebflowClient();
  const { isLoading, data: assets = [] } = usePromise(
    async () => {
      const result = await webflow.assets.list(siteId);
      return result.assets;
    },
    [],
    {
      onError,
    },
  );

  return (
    <List isLoading={isLoading}>
      {assets.map((asset) => (
        <List.Item
          key={asset.id}
          icon={asset.hostedUrl}
          title={`${asset.displayName}`}
          subtitle={asset.originalFileName}
        />
      ))}
    </List>
  );
}
