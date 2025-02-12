import { Action, ActionPanel, Icon, List } from "@raycast/api";
import Bitfinex from "../lib/api";
import { formatToDailyRate, formatToYearlyRate, getOfferClosedDate } from "../lib/utils";
import { CreateOfferForm } from "./CreateOfferForm";
import { EditOfferForm } from "./EditOfferForm";

export function OfferListItem({
  offer,
  canUpdate,
  canCancel,
  mutateBalanceInfo,
  mutateFundingInfo,
}: {
  offer: any;
  canUpdate?: boolean;
  canCancel?: boolean;
  mutateFundingInfo: () => void;
  mutateBalanceInfo: () => void;
}) {
  const rest = Bitfinex.rest();
  const symbol = offer.symbol.slice(1);
  const amount = Number(offer.amount).toFixed(2);
  const yearlyRate = formatToYearlyRate(offer.rate);
  const dayRate = formatToDailyRate(offer.rate);
  const period = offer.period;

  const isOpened = !!offer.mtsOpening;

  let daysLeftText;
  if (isOpened) {
    const closedDate = getOfferClosedDate(offer);
    const daysLeft = (closedDate - new Date().getTime()) / (24 * 60 * 60 * 1000);

    if (daysLeft < 1.5) {
      const hoursLeft = daysLeft * 24;
      daysLeftText = `in ${hoursLeft.toFixed(0)} hours`;
    } else {
      daysLeftText = `in ${Math.floor(daysLeft)} days`;
    }
  } else {
    daysLeftText = "";
  }

  return (
    <List.Item
      title={`${symbol} ${amount}`}
      icon={Icon.Coins}
      subtitle={daysLeftText}
      accessories={
        [
          offer?.hidden ? { icon: Icon.EyeDisabled, tooltip: "Hidden" } : null,
          {
            icon: Icon.Clock,
            text: `${period} days`,
            tooltip: "Period",
          },
          {
            text: `${yearlyRate}%`,
            tooltip: `${dayRate}% per day`,
          },
          {
            icon: Icon.Calendar,
            date: new Date(offer.mtsCreate),
            tooltip: "Created at",
          },
        ].filter(Boolean) as List.Item.Accessory[]
      }
      actions={
        <ActionPanel>
          {canUpdate && (
            <Action.Push
              title="Edit Offer"
              target={
                <EditOfferForm
                  offer={offer}
                  mutateBalanceInfo={mutateBalanceInfo}
                  mutateFundingInfo={mutateFundingInfo}
                />
              }
              icon={Icon.Pencil}
            />
          )}
          {canCancel && (
            <Action
              icon={Icon.XMarkCircle}
              title="Cancel Offer"
              onAction={async () => {
                await rest.cancelFundingOffer(offer.id);
                mutateBalanceInfo();
                mutateFundingInfo();
              }}
            />
          )}
          <Action.Push
            icon={Icon.PlusCircle}
            title="Create Offer"
            target={<CreateOfferForm mutateBalanceInfo={mutateBalanceInfo} mutateFundingInfo={mutateFundingInfo} />}
          />
        </ActionPanel>
      }
    />
  );
}
