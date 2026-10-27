import { Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { AccountActions, AccountMetadata, useAccount } from "./components/details";
import { accountStageColor } from "./lib/outseta/format";
import { Account } from "./lib/outseta/types";
import { getClient, showErrorToast, toRaycastColor } from "./lib/raycast";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useCachedState("accounts-showing-detail", true);
  const [selectedUid, setSelectedUid] = useState<string>();

  const { data, isLoading, pagination } = useCachedPromise(
    (query: string) => async (options: { page: number }) => {
      const page = await getClient().searchAccounts({ query: query.trim() || undefined, page: options.page });
      return { data: page.items, hasMore: page.hasMore };
    },
    [searchText],
    { keepPreviousData: true, onError: (error) => showErrorToast(error, "Couldn't search accounts") },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && !!data?.length}
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedUid(id ?? undefined)}
      searchBarPlaceholder="Search accounts"
      throttle
      pagination={pagination}
    >
      <List.EmptyView
        icon={Icon.Building}
        title={searchText ? "No accounts found" : "No accounts yet"}
        description={searchText ? `Nothing in Outseta matches "${searchText}".` : undefined}
      />
      {data?.map((account) => (
        <AccountItem
          key={account.Uid}
          account={account}
          selected={account.Uid === selectedUid}
          showingDetail={showingDetail}
          onDetailToggle={() => setShowingDetail(!showingDetail)}
        />
      ))}
    </List>
  );
}

function AccountItem(props: {
  account: Account;
  selected: boolean;
  showingDetail: boolean;
  onDetailToggle: () => void;
}) {
  const { account, showingDetail } = props;
  const { data: detail, isLoading } = useAccount(props.selected && showingDetail ? account.Uid : undefined);
  const full = detail ?? account;
  const stage = {
    tag: {
      value: account.AccountStageLabel ?? "Unknown",
      color: toRaycastColor(accountStageColor(account.AccountStage)),
    },
  };

  return (
    <List.Item
      id={account.Uid}
      title={account.Name ?? "(unnamed)"}
      icon={Icon.Building}
      accessories={showingDetail ? undefined : [stage]}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={<AccountMetadata key={detail ? "full" : "summary"} account={full} M={List.Item.Detail.Metadata} />}
        />
      }
      actions={<AccountActions account={full} onDetailToggle={props.onDetailToggle} />}
    />
  );
}
