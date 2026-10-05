import { Icon, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { EmailItem } from "./components/email-list";
import { SparkNotInstalled } from "./components/states";
import {
  INBOX_VIEWS,
  isSparkInstalled,
  parseEmailTable,
  runSpark,
} from "./lib/spark";
import { useAccounts } from "./lib/hooks";

const PAGE_SIZE = 50;

export default function Inbox() {
  if (!isSparkInstalled()) return <SparkNotInstalled />;
  return <InboxView />;
}

function InboxView() {
  const [view, setView] = useState("");
  const { hasTriage } = useAccounts();

  const { data, isLoading, error, revalidate, pagination } = usePromise(
    (value: string) => async (options: { page: number }) => {
      const def = INBOX_VIEWS.find((v) => v.value === value) ?? INBOX_VIEWS[0];
      const args = [
        "emails",
        "--page-size",
        String(PAGE_SIZE),
        "--page",
        String(options.page + 1),
      ];
      if (def.filter) args.push("--filter", def.filter);
      if (def.newSenders) args.push("--new-senders");
      const out = await runSpark(args);
      const rows = parseEmailTable(out);
      return { data: rows, hasMore: rows.length >= PAGE_SIZE };
    },
    [view],
  );

  if (error) showFailureToast(error, { title: "Couldn't load inbox" });

  const rows = data ?? [];

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Filter loaded emails…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="View"
          value={view}
          onChange={setView}
          storeValue
        >
          {INBOX_VIEWS.map((v) => (
            <List.Dropdown.Item
              key={v.value || "all"}
              title={v.title}
              value={v.value}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && rows.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="No emails"
          description="Nothing matched this view."
        />
      ) : (
        rows.map((row, i) => (
          <EmailItem
            key={`${row.id}-${i}`}
            row={row}
            canTriage={hasTriage(row.account)}
            onChange={revalidate}
          />
        ))
      )}
    </List>
  );
}
