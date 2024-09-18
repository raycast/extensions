import { useEffect, useMemo, useState } from "react";
import {
  Detail,
  Toast,
  showToast,
  ActionPanel,
  Action,
  List,
  LaunchProps,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { wiseReadApiToken } from "./helpers/preferences";
import { useCachedState } from "@raycast/utils";
import { CardPayment, activityTypes, ActivityType, fetchTransactions } from "./api/latestPayments";

export default function Command(props: LaunchProps<{ arguments: { profileId: string } }>) {
  const profileId = props.arguments.profileId;
  const [transactions, setTransactions] = useCachedState<CardPayment[]>(`id-${profileId}-transactions`);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchedType, setSearchedType] = useState<keyof typeof activityTypes | string>("");

  const filteredSelection = useMemo(() => {
    if (searchedType === "") return transactions;
    return transactions?.filter((transaction) => transaction.type === searchedType);
  }, [searchedType, transactions]);

  useEffect(() => {
    async function getBalances() {
      try {
        setIsLoading(true);
        const response = await fetchTransactions(profileId);
        setTransactions(response.activities);
      } catch (error) {
        await showToast({ title: "Error", message: "Failed to fetch Transactions", style: Toast.Style.Failure });
      } finally {
        setIsLoading(false);
      }
    }
    if (wiseReadApiToken) getBalances();
  }, []);

  if (!wiseReadApiToken) {
    const markdown = "API key Missing. Please update it in extension preferences and try again.";
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List
      navigationTitle="Search Transactions (Last 100 Only)"
      searchBarPlaceholder="e.g. Netflix"
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Activity Type" onChange={(newType) => setSearchedType(newType)}>
          <List.Dropdown.Section title="Types">
            <List.Dropdown.Item title="ALL" value="" />
            {activityTypes.map((type) => (
              <List.Dropdown.Item key={type} title={ActivityType[type]} value={type} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredSelection?.map((transaction) => (
        <List.Item
          key={transaction.id}
          title={transaction.title.replace(/<.*?>/g, "")}
          subtitle={transaction.primaryAmount}
          accessories={[
            ...(transaction.description ? [{ tag: { value: transaction.description, color: "#A2D6F9" } }] : []),
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link
                    text={"Wise.com"}
                    title="Open In Browser"
                    target={`https://wise.com/transactions/activities/by-resource/${transaction.resource.type}/${transaction.resource.id}`}
                  />
                  <List.Item.Detail.Metadata.Label title="ID" text={transaction.resource.id} />
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item text={ActivityType[transaction.type]} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Name" text={transaction.title.replace(/<.*?>/g, "")} />
                  <List.Item.Detail.Metadata.Label title="Description" text={transaction.description} />
                  <List.Item.Detail.Metadata.Label title="Primary Amount" text={transaction.primaryAmount} />
                  <List.Item.Detail.Metadata.Label title="Secondary Amount" text={transaction.secondaryAmount} />
                  <List.Item.Detail.Metadata.Label title="Status" text={transaction.status} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://wise.com/transactions/activities/by-resource/${transaction.resource.type}/${transaction.resource.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
      {transactions?.length === 0 && <List.EmptyView title="No Transaction Found" />}
    </List>
  );
}
