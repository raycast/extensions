import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FundingOffer } from "bfx-api-node-models";
import LendingRates from "./lending-rates";
import Bitfinex from "./api";
import useSWR, { mutate } from "swr";
import { getCurrency, getPreferenceValues } from "./preference";
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
          {canUpdate && (
            <Action.Push title="Update Offer" target={<EditOfferForm offer={offer} />} icon={Icon.Pencil} />
          )}
          {canCancel && (
            <Action
              icon={Icon.XMarkCircle}
              title="Cancel Offer"
              onAction={async () => {
                await rest.cancelFundingOffer(offer.id);
                mutate("/api/funding-offers");
                mutate("/api/balance");
              }}
            />
          )}
          <Action.Push icon={Icon.Plus} title="Create Offer" target={<CreateOfferForm />} />
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

      mutate("/api/funding-offers");
      mutate("/api/balance");

      pop();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Update Offer Failed",
        message: String(e),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Offer" onSubmit={onSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="amount" title="Amount" defaultValue={Number(props.offer.amount).toFixed(5)} />
      <Form.TextField id="rate" title="Rate (in APR)" defaultValue={defaultRate} />
      <Form.TextField id="period" title="Period (in days)" defaultValue={String(props.offer.period)} />
    </Form>
  );
}

function CreateOfferForm() {
  const rest = Bitfinex.rest();
  const { pop } = useNavigation();

  const onSubmit = async (values: any) => {
    try {
      const newOffer = new FundingOffer({
        type: "LIMIT",
        symbol: values.symbol,
        rate: parseFloat(values.rate) / 100 / 365,
        amount: parseFloat(values.amount),
        period: parseInt(values.period, 10),
      });
      await rest.submitFundingOffer(newOffer);
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Create Offer Failed",
        message: String(e),
      });
    }

    mutate("/api/funding-offers");
    mutate("/api/balance");
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Offer" onSubmit={onSubmit} icon={Icon.Plus} />
          <Action.Push title="Show Lending Rates" target={<LendingRates />} icon={Icon.LevelMeter} />
        </ActionPanel>
      }
    >
      <Form.TextField id="symbol" title="Symbol" defaultValue={getCurrency()} />

      <Form.TextField id="amount" title="Amount" defaultValue="100" />
      <Form.TextField
        id="rate"
        title="Rate (in APR)"
        defaultValue="18"
        info="You can lookup lending rates for reference"
      />
      <Form.TextField id="period" title="Period (in days)" defaultValue="7" />
    </Form>
  );
}

export default function FundingOffers() {
  const rest = Bitfinex.rest();
  const { f_currency } = getPreferenceValues();

  const { data = [], isValidating } = useSWR(
    "/api/funding-credits",
    () => rest.fundingCredits(getCurrency()) as Promise<any[]>
  );

  const { data: activeOffers = [], isValidating: activeOfferLoading } = useSWR(
    "/api/funding-offers",
    () => rest.fundingOffers(getCurrency()) as Promise<any[]>
  );

  const { data: balanceInfo, isValidating: isBalanceLoading } = useSWR(
    "/api/balance",
    () => rest.calcAvailableBalance(getCurrency(), 0, 0, "FUNDING") as Promise<any>
  );

  return (
    <List isLoading={isValidating || activeOfferLoading || isBalanceLoading}>
      {balanceInfo && (
        <List.Section title="Available Funding">
          <List.Item
            title={`${Math.abs(balanceInfo[0])} ${f_currency}`}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Plus} title="Create Offer" target={<CreateOfferForm />} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

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
