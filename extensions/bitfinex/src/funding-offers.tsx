import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { getCurrency, getPreferenceValues } from "./lib/preference";
import { useFundingBalanceInfo, useFundingCredits, useFundingOffers } from "./lib/hooks";
import { formatToYearlyRate } from "./lib/utils";
import { OfferListItem } from "./components/OfferListItem";
import { CreateOfferForm } from "./components/CreateOfferForm";

export default function FundingOffers() {
  const { f_currency } = getPreferenceValues();

  const currency = getCurrency();

  const { data = [], isLoading } = useFundingCredits(currency);
  const {
    data: activeOffers = [],
    isLoading: activeOfferLoading,
    mutate: mutateFundingInfo,
  } = useFundingOffers(currency);
  const { data: balanceInfo, isLoading: isBalanceLoading, mutate: mutateBalanceInfo } = useFundingBalanceInfo(currency);

  const totalAmount = useMemo(() => {
    const offers = data?.filter((offer) => !offer.hidden);

    return offers.reduce((acc, offer) => acc + offer.amount, 0);
  }, [data]);

  const averageRateByOffers = useMemo(() => {
    const offers = data?.filter((offer) => !offer.hidden);

    if (!offers || offers.length === 0) {
      return 0;
    }

    const averageRate = offers.reduce((acc, offer) => acc + offer.rate * offer.amount, 0) / totalAmount;

    // 20% for the fee
    return averageRate * 0.8;
  }, [data]);

  const estimatedDailyInterest = useMemo(() => {
    return totalAmount * averageRateByOffers;
  }, [totalAmount, averageRateByOffers]);

  return (
    <List isLoading={isLoading || activeOfferLoading || isBalanceLoading} filtering={false}>
      <List.Section title="Summary">
        {balanceInfo && (
          <List.Item
            title={"Available Funding"}
            icon={Icon.Coin}
            accessories={[
              {
                text: `${Math.abs(balanceInfo[0])} ${f_currency}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.PlusCircle}
                  title="Create Offer"
                  target={
                    <CreateOfferForm mutateBalanceInfo={mutateBalanceInfo} mutateFundingInfo={mutateFundingInfo} />
                  }
                />
              </ActionPanel>
            }
          />
        )}

        {averageRateByOffers > 0 && (
          <>
            <List.Item
              title="Average Daily Rate"
              icon={Icon.LineChart}
              accessories={[
                {
                  text: `${formatToYearlyRate(averageRateByOffers)}%`,
                },
              ]}
            />

            <List.Item
              title={"Estimated Daily Interest"}
              subtitle="May vary based on actual rate"
              icon={Icon.Coin}
              accessories={[
                {
                  text: `${estimatedDailyInterest.toFixed(4)} ${f_currency}`,
                },
              ]}
            />
          </>
        )}
      </List.Section>

      <List.Section title="Pending Offers">
        {activeOffers?.map((offer) => {
          return (
            <OfferListItem
              key={offer.id}
              offer={offer}
              canUpdate
              canCancel
              mutateBalanceInfo={mutateBalanceInfo}
              mutateFundingInfo={mutateFundingInfo}
            />
          );
        })}
      </List.Section>

      <List.Section title="Provided Offers">
        {data
          ?.filter((offer) => !offer.hidden)
          .map((offer) => {
            return (
              <OfferListItem
                key={offer.id}
                offer={offer}
                mutateBalanceInfo={mutateBalanceInfo}
                mutateFundingInfo={mutateFundingInfo}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
