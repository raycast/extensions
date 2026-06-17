import * as nosql from "oci-nosql";
import { OCIProvider, useProvider } from "./oci";
import { useCachedPromise } from "@raycast/utils";
import { onError } from "./utils";
import { ActionPanel, List } from "@raycast/api";
import OpenInOCI from "./open-in-oci";

export default function Command() {
  return (
    <OCIProvider>
      <NoSQLDatabase />
    </OCIProvider>
  );
}

function NoSQLDatabase() {
  const { provider } = useProvider();
  const { isLoading, data: tables } = useCachedPromise(
    async () => {
      const nosqlClient = new nosql.NosqlClient({ authenticationDetailsProvider: provider });
      const tables = await nosqlClient.listTables({ compartmentId: provider.getTenantId() });
      return tables.tableCollection.items ?? [];
    },
    [],
    { initialData: [], onError },
  );

  return (
    <List isLoading={isLoading}>
      {tables.map((table) => (
        <List.Item
          key={table.id}
          title={table.id}
          actions={
            <ActionPanel>
              <OpenInOCI route="nosql/tables" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
