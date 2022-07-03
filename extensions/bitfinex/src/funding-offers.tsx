import { Color, Icon, List } from "@raycast/api";
import Bitfinex from "./api";
import useSWR from "swr";
("swr");

export default function FundingOffers() {
  const rest = Bitfinex.rest();

  const { data = [], isValidating } = useSWR("/api/funding-offers", () => rest.fundingOfferHistory() as Promise<any[]>);

  return (
    <List isLoading={isValidating}>
      {data?.map((offer) => {
        const symbol = offer.symbol.slice(1);
        const amount = Number(offer.amountOrig).toFixed(2);
        const canceled = offer.status === "CANCELED";
        const yearlyRate = Number(offer.rate * 365 * 100).toFixed(2);
        const dayRate = Number(offer.rate * 100).toFixed(5);

        return (
          <List.Item
            key={offer.id}
            title={symbol}
            subtitle={amount}
            icon={{
              source: canceled ? Icon.XmarkCircle : Icon.Checkmark,
              tintColor: canceled ? Color.Red : Color.Green,
            }}
            accessories={[
              {
                text: canceled ? "Canceled" : "Active",
              },
              {
                text: `${yearlyRate}%`,
                tooltip: `${dayRate}% per day`,
              },
              {
                icon: Icon.Calendar,
                date: new Date(offer.mtsCreate),
              }
            ]}
          ></List.Item>
        );
      })}
    </List>
  );
}
