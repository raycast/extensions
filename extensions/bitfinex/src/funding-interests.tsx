import { Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { useFundingInterests } from "./lib/hooks";

export default function FundingOffers() {
  const { data = [], isLoading } = useFundingInterests();

  const totalInterest = useMemo(() => {
    return data.reduce((total, interest) => {
      return total + interest.amount;
    }, 0);
  }, [data]);

  const currentBalance = useMemo(() => {
    return Number(data?.[0]?.balance ?? 0).toFixed(2);
  }, [data]);

  return (
    <List isLoading={isLoading} filtering={false}>
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
              icon={Icon.Coins}
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
