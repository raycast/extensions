import { Icon, List } from "@raycast/api";
import Bitfinex from "./api";
import useSWR from "swr";
("swr");

function OfferListItem({ offer }: { offer: any }) {
  const symbol = offer.symbol.slice(1);
  const amount = Number(offer.amount).toFixed(2);
  const yearlyRate = Number(offer.rate * 365 * 100).toFixed(2);
  const dayRate = Number(offer.rate * 100).toFixed(5);
  const period = offer.period;

  const isOpened = !!offer.mtsOpening;

  let daysLeftText;
  if (isOpened) {
    const opened = new Date(offer.mtsOpening);
    const closedDate = opened.getTime() + period * 24 * 60 * 60 * 1000;

    const daysLeft = (closedDate - new Date().getTime()) / (24 * 60 * 60 * 1000);

    if (daysLeft < 1) {
      const hoursLeft = daysLeft * 24;
      daysLeftText = `${hoursLeft.toFixed(0)}h/${period}d left`;
    } else {
      daysLeftText = `${Math.floor(daysLeft)}/${period} days left`;
    }
  }

  return (
    <List.Item
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
        },
      ]}
    ></List.Item>
  );
}

export default function FundingOffers() {
  const rest = Bitfinex.rest();

  const { data = [], isValidating } = useSWR("/api/funding-credits", () => rest.fundingCredits() as Promise<any[]>);

  const { data: activeOffers = [], isValidating: activeOfferLoading } = useSWR(
    "/api/funding-offers",
    () => rest.fundingOffers() as Promise<any[]>
  );

  return (
    <List isLoading={isValidating || activeOfferLoading}>
      <List.Section title="Pending Offers">
        {activeOffers?.map((offer) => {
          return <OfferListItem key={offer.id} offer={offer} />;
        })}
      </List.Section>

      <List.Section title="Provided Offers">
        {data
          ?.filter((offer) => !offer.hidden)
          .map((offer) => {
            return <OfferListItem key={offer.id} offer={offer} />;
          })}
      </List.Section>
    </List>
  );
}
