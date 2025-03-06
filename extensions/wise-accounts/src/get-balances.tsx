import { useEffect, useState } from "react";
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
import { mainProfileId, wiseReadApiToken } from "./helpers/preferences";
import { Balance, fetchBalances } from "./api/balances";
import { useCachedState } from "@raycast/utils";
import { filterPreferedBalances } from "./helpers/filterPreferedBalances";

export default function Command(props: LaunchProps<{ arguments: { profileId: string } }>) {
  const profileId = props.arguments.profileId?.length ? props.arguments.profileId : mainProfileId ?? "";
  const [balances, setBalances] = useCachedState<Balance[]>(`id-${profileId}-balances`);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function getBalances() {
      try {
        setIsLoading(true);
        const response = await fetchBalances(profileId);
        setBalances(response);
      } catch (error) {
        await showToast({ title: "Error", message: "Failed to fetch balances", style: Toast.Style.Failure });
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
    <List isLoading={isLoading} isShowingDetail>
      {filterPreferedBalances(balances).map((balance) => (
        <List.Item
          key={balance.id}
          title={`${balance.currency} ${balance.amount.value}`}
          subtitle={balance.type}
          icon={
            balance.type === "STANDARD"
              ? { source: `https://wise.com/web-art/assets/flags/${balance.currency.toLocaleLowerCase()}.svg` }
              : Icon.Coins
          }
          accessories={[...(balance.name ? [{ tag: { value: balance.name, color: "#A2D6F9" } }] : [])]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link
                    text={"Wise.com"}
                    title="Open In Browser"
                    target={`https://wise.com/balances/${balance.id}`}
                  />
                  <List.Item.Detail.Metadata.Label title="ID" text={balance.id.toString()} />
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={balance.type}
                      color={balance.type === "STANDARD" ? "#A2D6F9" : "#F7B32B"}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label
                    title="Name"
                    text={balance.name || "N/A"}
                    icon={balance.icon?.type === "EMOJI" ? balance.icon?.value : ""}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Amount"
                    text={`${balance.amount.currency} ${balance.amount.value}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Cash Amount"
                    text={`${balance.cashAmount.currency} ${balance.cashAmount.value}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Reserved Amount"
                    text={`${balance.reservedAmount.currency} ${balance.reservedAmount.value}`}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://wise.com/balances/${balance.id}`} />
            </ActionPanel>
          }
        />
      ))}
      {balances?.length === 0 && <List.EmptyView title="No balance found" />}
    </List>
  );
}
