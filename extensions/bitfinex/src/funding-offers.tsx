import { Icon, List } from "@raycast/api";
import Bitfinex from "./api";
import useSWR from "swr";
("swr");

export default function FundingOffers() {
  const rest = Bitfinex.rest();

  const { data = [], isValidating } = useSWR("/api/funding-credits", () => rest.fundingCredits() as Promise<any[]>);

  return (
    <List isLoading={isValidating}>
      {data?.filter(offer => !offer.hidden).map((offer) => {
        console.log(offer)
        const symbol = offer.symbol.slice(1);
        const amount = Number(offer.amount).toFixed(2);
        const yearlyRate = Number(offer.rate * 365 * 100).toFixed(2);
        const dayRate = Number(offer.rate * 100).toFixed(5);
        const period = offer.period;

        const opened = new Date(offer.mtsOpening)
        const closedDate = opened.getTime() + period * 24 * 60 * 60 * 1000;

        const daysLeft = (closedDate - new Date().getTime()) / (24 * 60 * 60 * 1000);

        let daysLeftText
        if (daysLeft < 1) {
          const hoursLeft = daysLeft * 24;
          daysLeftText = `${hoursLeft.toFixed(0)}h/${period}d left`
        } else {
          daysLeftText = `${Math.floor(daysLeft)}/${period} days left`
        }

        return (
          <List.Item
            key={offer.id}
            title={`${symbol} ${amount}`}
            subtitle={daysLeftText}
            accessories={[
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
