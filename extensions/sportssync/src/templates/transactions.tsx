import { Detail, List, Icon, Action, ActionPanel } from "@raycast/api";
import getTransactions from "../utils/getTransactions";
import sportInfo from "../utils/getSportInfo";
import TeamDetail from "../views/teamDetail";

interface DayItems {
  title: string;
  transactions: JSX.Element[];
}

export default function DisplayTransactions() {
  const { transactionData, transactionLoading, transactionRevalidate } = getTransactions();
  const currentLeague = sportInfo.getLeague();

  const transactionDayItems: DayItems[] = [];
  const transactions = transactionData?.transactions || [];

  transactions?.map((transaction, index) => {
    const transactionDate = new Date(transaction?.date ?? "Unknown").toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const playerTransaction = transactionDate;

    let dayItem = transactionDayItems?.find((item) => item?.title === playerTransaction);

    if (!dayItem) {
      dayItem = { title: playerTransaction, transactions: [] };
      transactionDayItems.push(dayItem);
    }

    dayItem.transactions.push(
      <List.Item
        key={index}
        title={`${transaction?.description ?? "Unknown"}`}
        icon={{
          source:
            transaction?.team.logos[0]?.href ??
            `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${currentLeague}.png&w=100&h=100&transparent=true`,
        }}
        accessories={[{ icon: Icon.Switch }]}
        actions={
          <ActionPanel>
            <Action.Push
              title={`View ${transaction?.team?.displayName ?? "Team"} Details`}
              icon={Icon.List}
              target={<TeamDetail teamId={transaction?.team?.id ?? ""} />}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={transactionRevalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            ></Action>
          </ActionPanel>
        }
      />,
    );
  });

  if (transactionLoading) {
    return <Detail isLoading={true} />;
  }

  if (!transactionData || transactionDayItems.length === 0) {
    return <List.EmptyView icon="Empty.png" title="No Results Found" />;
  }

  return (
    <>
      {transactionDayItems.map((dayItem, index) => (
        <List.Section key={index} title={`${dayItem?.title ?? "Transaction"}`}>
          {dayItem?.transactions}
        </List.Section>
      ))}
    </>
  );
}
