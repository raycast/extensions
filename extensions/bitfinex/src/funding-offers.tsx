import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { FundingOffer } from "bfx-api-node-models";
import Bitfinex from "./api";
import useSWR, { mutate } from "swr";
("swr");

function OfferListItem({ offer, canUpdate, canCancel }: { offer: any; canUpdate?: boolean; canCancel?: boolean }) {
  const rest = Bitfinex.rest();
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
  } else {
    daysLeftText = `${period} days`;
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
      actions={
        <ActionPanel>
          {canUpdate && <Action.Push title="Update Offer" target={<EditOfferForm offer={offer} />} />}
          {canCancel && (
            <Action
              title="Cancel Offer"
              onAction={async () => {
                await rest.cancelFundingOffer(offer.id);
                mutate("/api/funding-offers");
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function EditOfferForm(props: { offer: any }) {
  const defaultRate = Number(props.offer.rate * 365 * 100).toFixed(3);
  const rest = Bitfinex.rest();
  const { pop } = useNavigation();

  const onSubmit = async (values: any) => {
    try {
      const newOffer = new FundingOffer({
        type: "LIMIT",
        symbol: props.offer.symbol,
        rate: parseFloat(values.rate) / 100 / 365,
        amount: parseFloat(values.amount),
        period: parseInt(values.period, 10),
      });
      await rest.cancelFundingOffer(props.offer.id);
      await rest.submitFundingOffer(newOffer);
    } catch (e) {
      console.error(e);
    }

    mutate("/api/funding-offers");
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Answer" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="symbol" title="Symbol" defaultValue={props.offer.symbol} />

      <Form.TextField id="amount" title="Amount" defaultValue={Number(props.offer.amount).toFixed(5)} />
      <Form.TextField id="rate" title="Rate (in APR)" defaultValue={defaultRate} />
      <Form.TextField id="period" title="Period (in days)" defaultValue={String(props.offer.period)} />
    </Form>
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
          return <OfferListItem key={offer.id} offer={offer} canUpdate canCancel />;
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
