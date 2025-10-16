import { useEffect, useState } from "react";
import { MenuBarExtra, openExtensionPreferences, open, Icon, Image } from "@raycast/api";
import { mainProfileId, wiseReadApiToken } from "./helpers/preferences";
import { Balance, fetchBalances } from "./api/balances";
import { ACTIVITY_STATUS, WISE_FAVICON } from "./helpers/constants";
import { filterPreferedBalances } from "./helpers/filterPreferedBalances";
import { Transaction, fetchTodaysTransactions } from "./api/latestTransactions";
import { showFailureToast, useCachedState } from "@raycast/utils";

export default function Command() {
  const [balances, setBalances] = useCachedState<Balance[]>(`id-${mainProfileId}-balances`);
  const [transactions, setTransactions] = useCachedState<Transaction[]>(`id-${mainProfileId}-transactions`);
  const [error, setError] = useState<Error | null>();

  useEffect(() => {
    async function getBalances() {
      try {
        const response = await fetchBalances(mainProfileId!);
        const latestTransaction = await fetchTodaysTransactions(mainProfileId!);
        setBalances(response);
        setTransactions(latestTransaction.activities);
      } catch (error) {
        setError(error instanceof Error ? error : new Error("Something went wrong"));
        await showFailureToast({ title: "Error", message: "Failed to fetch balances" });
      }
    }
    if (wiseReadApiToken && mainProfileId !== undefined) getBalances();
  }, []);

  if (mainProfileId === "") {
    return (
      <MenuBarExtra icon={WISE_FAVICON} title={"!"} tooltip="!">
        <MenuBarExtra.Item title="Update Main Profile ID" onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }
  if (!balances && !transactions && !error) {
    return <MenuBarExtra icon={WISE_FAVICON} title="Loading..." isLoading={true} />;
  }
  return (
    <MenuBarExtra icon={WISE_FAVICON} tooltip="Your Pull Requests">
      <MenuBarExtra.Section title="Balances">
        {filterPreferedBalances(balances).map((balance) => (
          <MenuBarExtra.Item
            key={balance.id}
            title={`${balance.currency} ${balance.amount.value}`}
            icon={
              balance.type === "STANDARD"
                ? { source: `https://wise.com/web-art/assets/flags/${balance.currency.toLocaleLowerCase()}.svg` }
                : Icon.Coins
            }
            subtitle={balance.name || ""}
            onAction={() => {
              open(`https://wise.com/balances/${balance.id}`);
            }}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Today's Payments">
        {transactions
          ?.filter((transaction) => transaction.status !== ACTIVITY_STATUS.CANCELLED)
          ?.map((transaction) => (
            <MenuBarExtra.Item
              key={transaction.id}
              title={transaction.title.replace(/<.*?>/g, "")}
              subtitle={transaction.primaryAmount}
              onAction={() => {
                open(
                  `https://wise.com/transactions/activities/by-resource/CARD_TRANSACTION/${transaction.resource.id}`,
                );
              }}
            />
          ))}
        {transactions?.filter((transaction) => transaction.status !== ACTIVITY_STATUS.CANCELLED).length === 0 && (
          <MenuBarExtra.Item title="No transaction found today" />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Gear} title="Open Preferences" onAction={openExtensionPreferences} />
        <MenuBarExtra.Item
          icon={{ source: WISE_FAVICON, mask: Image.Mask.Circle }}
          title="Open Wise"
          onAction={() => open("https://wise.com")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
