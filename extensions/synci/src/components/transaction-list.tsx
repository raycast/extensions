import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { PERIODS } from "../lib/finance";
import type { Period } from "../lib/types";
import { useAccounts } from "../hooks/use-data";
import { AccountDropdown, CommonActions, PeriodActions, ToggleDetailsAction } from "./common";
import { ErrorView } from "./session";
import { TransactionItem } from "./transaction";
import { amountSearch } from "../lib/transaction-search";

export function TransactionList({
  initialQuery = "",
  initialAccountId = "all",
  navigationTitle,
}: {
  initialQuery?: string;
  initialAccountId?: string;
  navigationTitle?: string;
}) {
  const [search, setSearch] = useState(initialQuery);
  const [accountId, setAccountId] = useState(initialAccountId);
  const [period, setPeriod] = useState<Period>("all");
  const [status, setStatus] = useState("all");
  const [showDetails, setShowDetails] = useState(getPreferenceValues<Preferences>().showDetails);
  const accounts = useAccounts();
  const abortable = useRef<AbortController | null>(null);
  const queryKey = JSON.stringify([search, accountId, period, status]);
  const amount = amountSearch(search);
  const loadedKey = useRef("");
  const { data, error, isLoading, revalidate, pagination } = usePromise(
    (search: string, accountId: string, period: Period, status: string) =>
      async ({ page, cursor }: { page: number; cursor?: number }) => {
        return api.transactionBatch(
          { search, accountId, period, booked: status === "all" ? undefined : status === "booked" },
          cursor ?? page + 1,
          abortable.current?.signal,
        );
      },
    [search, accountId, period, status],
    {
      abortable,
      onError: () => {},
      onData: () => {
        loadedKey.current = queryKey;
      },
    },
  );
  const refresh = () => {
    void revalidate();
    void accounts.revalidate();
  };
  const filters = (
    <>
      <ActionPanel.Section title="Filters">
        <PeriodActions period={period} onChange={setPeriod} />
        <ActionPanel.Submenu title="Filter by Status" icon={Icon.Filter}>
          {[
            ["all", "All Transactions"],
            ["booked", "Booked"],
            ["pending", "Pending"],
          ].map(([value, title]) => (
            <Action
              key={value}
              title={title}
              icon={status === value ? Icon.Checkmark : Icon.Circle}
              onAction={() => setStatus(value)}
            />
          ))}
        </ActionPanel.Submenu>
        <ToggleDetailsAction showDetails={showDetails} onToggle={() => setShowDetails((value) => !value)} />
      </ActionPanel.Section>
    </>
  );
  const seen = new Set<number>();
  const transactions =
    loadedKey.current === queryKey
      ? data?.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        })
      : undefined;
  const failure = error || accounts.error;
  return (
    <List
      navigationTitle={navigationTitle}
      searchText={search}
      onSearchTextChange={setSearch}
      throttle
      filtering={false}
      isLoading={isLoading || accounts.isLoading || (loadedKey.current !== queryKey && !failure)}
      isShowingDetail={showDetails && !!transactions?.length && !failure}
      pagination={failure ? undefined : pagination}
      searchBarPlaceholder="Search for transactions"
      searchBarAccessory={<AccountDropdown accounts={accounts.data} value={accountId} onChange={setAccountId} />}
    >
      {failure ? (
        <ErrorView error={failure} retry={refresh}>
          {filters}
        </ErrorView>
      ) : (
        <>
          {!transactions?.length && (
            <List.EmptyView
              title={isLoading ? "Searching Transactions" : search ? "No Matching Transactions" : "No Transactions"}
              description={
                isLoading
                  ? amount
                    ? "Looking through the selected account and date range for this amount…"
                    : "Loading transactions from Synci…"
                  : "Try another search, account, period, or status. Search names and descriptions, or enter an amount such as 50.25 or -50.25."
              }
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  {filters}
                  <CommonActions refresh={refresh} />
                </ActionPanel>
              }
            />
          )}
          <List.Section
            title={PERIODS.find((item) => item.value === period)?.title}
            subtitle={`${transactions?.length ?? 0} loaded${amount ? ` · Amount ${amount.label}` : ""}${status !== "all" ? ` · ${status}` : ""} · Booking date`}
          >
            {transactions?.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                showDetails={showDetails}
                refresh={refresh}
              >
                {filters}
              </TransactionItem>
            ))}
          </List.Section>
          {amount && transactions?.length && pagination?.hasMore ? (
            <List.Item
              id="load-more"
              title={isLoading ? "Searching Older Transactions…" : "Search Older Transactions"}
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <Action
                    title="Search Older Transactions"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => {
                      if (!isLoading) pagination.onLoadMore();
                    }}
                  />
                  {filters}
                </ActionPanel>
              }
            />
          ) : null}
        </>
      )}
    </List>
  );
}
