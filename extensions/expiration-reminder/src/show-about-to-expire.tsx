import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { listExpirations } from "./api/endpoints";
import { ExpirationListItem } from "./components/ExpirationListItem";
import { getDefaultExpiryWindow, getPageSize } from "./lib/preferences";
import { track } from "./lib/telemetry";

const WINDOW_OPTIONS = ["7", "30", "60", "90"];

export default function ShowAboutToExpireCommand() {
  const [windowDays, setWindowDays] = useState<number>(getDefaultExpiryWindow());

  useEffect(() => track({ name: "command_opened", command_name: "show-about-to-expire" }), []);

  const { isLoading, data, pagination } = usePromise(
    (win: number) =>
      async ({ page }: { page: number }) => {
        const apiPage = page + 1;
        // Server-side date-window filter (ENG-2641): the API returns only items
        // expiring within [today, today+win], so no client-side filtering needed.
        const res = await listExpirations({
          status: "current",
          expiresWithinDays: win,
          sort: "expiration_date",
          sortDirection: "asc",
          paging: getPageSize(),
          page: apiPage,
        });

        track({
          name: "list_viewed",
          command_name: "show-about-to-expire",
          result_count: res.expiration_items.length,
          page: apiPage,
        });
        return { data: res.expiration_items, hasMore: apiPage < res.pages };
      },
    [windowDays],
  );

  const items = data ?? [];

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Filter items expiring soon…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Expiring within"
          value={String(windowDays)}
          onChange={(value) => setWindowDays(Number(value))}
        >
          {WINDOW_OPTIONS.map((days) => (
            <List.Dropdown.Item key={days} title={`Next ${days} days`} value={days} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && items.length === 0 ? (
        <List.EmptyView
          icon="icon.png"
          title={`Nothing expiring in the next ${windowDays} days`}
          description="Adjust the window from the dropdown to widen the range."
        />
      ) : (
        <List.Section title={`Expiring within ${windowDays} days`} subtitle={`${items.length} loaded`}>
          {items.map((item) => (
            <ExpirationListItem key={item.id} item={item} windowDays={windowDays} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
