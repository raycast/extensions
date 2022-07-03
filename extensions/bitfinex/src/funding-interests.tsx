import { List } from "@raycast/api";
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

  return (
    <List isLoading={isValidating}>
      {data?.map((interest) => {
        const amount = Number(interest.amount).toFixed(2);
        const roi = Number((interest.amount / (interest.balance - interest.amount)) * 365 * 100).toFixed(2);

        return (
          <List.Item
            key={interest.id}
            title={interest.currency}
            subtitle={amount}
            accessories={[
              {
                text: `${roi}%`,
              },
              {
                date: new Date(interest.mts),
              },
            ]}
          />
        );
      })}
    </List>
  );
}
