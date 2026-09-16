import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { listExpirations } from "./api/endpoints";
import { ExpirationListItem } from "./components/ExpirationListItem";
import { getPageSize } from "./lib/preferences";
import { track } from "./lib/telemetry";

export default function ShowExpiredCommand() {
  useEffect(() => track({ name: "command_opened", command_name: "show-expired" }), []);

  const { isLoading, data, pagination } = usePromise(
    () =>
      async ({ page }: { page: number }) => {
        const apiPage = page + 1;
        const res = await listExpirations({
          status: "expired",
          sort: "expiration_date",
          sortDirection: "asc",
          paging: getPageSize(),
          page: apiPage,
        });
        track({ name: "list_viewed", command_name: "show-expired", result_count: res.total, page: apiPage });
        return { data: res.expiration_items, hasMore: apiPage < res.pages };
      },
    [],
  );

  const items = data ?? [];

  return (
    <List isLoading={isLoading} pagination={pagination} searchBarPlaceholder="Filter expired items…">
      {!isLoading && items.length === 0 ? (
        <List.EmptyView
          icon="icon.png"
          title="No expired items 🎉"
          description="Nothing is past its expiration date."
        />
      ) : (
        <List.Section title="Expired" subtitle={`${items.length} loaded`}>
          {items.map((item) => (
            <ExpirationListItem key={item.id} item={item} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
