import { List } from "@raycast/api";
import { useMemo } from "react";
import Bitfinex from "./api";
import useSWR from "swr";
("swr");

export default function FundingOffers() {
  const rest = Bitfinex.rest();

  const { data = [], isValidating } = useSWR(
    "/api/funding-credits",
    () =>
      rest.ledgers({
        category: 28, // Margin funding interests
      }) as Promise<any[]>
  );

  const totalInterest = useMemo(() => {
    return data.reduce((total, interest) => {
      return total + interest.amount;
    }, 0);
  }, [data]);

  const currentBalance = useMemo(() => {
    return Number(data?.[0]?.balance ?? 0).toFixed(2);
  }, [data]);

  return (
    <List isLoading={isValidating}>
      <List.Section title="Interests Summary">
        <List.Item title="Total Interests" accessories={[{ text: `${totalInterest.toFixed(2)} USD` }]} />
        <List.Item title="Balance" accessories={[{ text: `${currentBalance} USD` }]} />
      </List.Section>

      <List.Section title="Daily Interests">
        {data?.map((interest) => {
          const amount = Number(interest.amount).toFixed(2);
          const roi = Number((interest.amount / (interest.balance - interest.amount)) * 365 * 100).toFixed(2);

          return (
            <List.Item
              key={interest.id}
              title={`$${amount} ${interest.currency}`}
              subtitle={`${roi}%`}
              accessories={[
                {
                  date: new Date(interest.mts),
                },
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
