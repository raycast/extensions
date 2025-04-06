import { Detail, List } from "@raycast/api";
import ProviderContextProvider, { useProvider } from "./provider-context";
import { useCachedPromise } from "@raycast/utils";
import { nosql, objectstorage } from "oci-sdk";

export default function Command() {
  return (
    <ProviderContextProvider>
      <NoSQLDatabase />
    </ProviderContextProvider>
  );
}

function NoSQLDatabase() {
  const { provider } = useProvider();
  const {
    isLoading,
    data: tables,
  } = useCachedPromise(
    async () => {
      const nosqlClient = new nosql.NosqlClient({ authenticationDetailsProvider: provider });
      const tables = await nosqlClient.listTables({ compartmentId: provider.getTenantId() })
      return tables.tableCollection.items;
    },
    [],
    { initialData: [], onError(error) {
      console.log(error)
    } },
  );

  return <List isLoading={isLoading}>
    {tables?.map(table => <List.Item key={table.id} title={""} />)}
  </List>
}
