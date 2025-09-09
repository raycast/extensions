import { ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { onError } from "./utils";
import * as objectstorage from "oci-objectstorage";
import { OCIProvider, useProvider } from "./oci";
import OpenInOCI from "./open-in-oci";

export default function CheckProvider() {
  return (
    <OCIProvider>
      <ObjectStorage />
    </OCIProvider>
  );
}

function ObjectStorage() {
  const { provider } = useProvider();

  const { isLoading, data: buckets } = useCachedPromise(
    async () => {
      const objectstorageClient = new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
      const namespace = await objectstorageClient.getNamespace({ compartmentId: provider.getTenantId() });
      const buckets = await objectstorageClient.listBuckets({
        namespaceName: namespace.value,
        compartmentId: provider.getTenantId(),
      });
      return buckets.items;
    },
    [],
    { initialData: [], onError },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search buckets">
      {buckets.map((bucket) => (
        <List.Item
          key={bucket.namespace + bucket.name}
          icon={Icon.Coin}
          title={bucket.name}
          accessories={[
            {
              date: new Date(bucket.timeCreated),
              tooltip: `Created ${new Date(bucket.timeCreated)}`,
            },
          ]}
          actions={
            <ActionPanel>
              <OpenInOCI route={`object-storage/buckets/${bucket.namespace}/${bucket.name}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
