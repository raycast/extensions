import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useEffect } from "react";
import { getCurrency, getPreferenceValues } from "./lib/preference";
import { useCachedActiveOffers, useFundingBalanceInfo, useFundingCredits, useFundingOffers } from "./lib/hooks";
import { formatToYearlyRate, getOfferClosedDate } from "./lib/utils";
import { OfferListItem } from "./components/OfferListItem";
import { CreateOfferForm } from "./components/CreateOfferForm";
import { BatchCreateOfferForm } from "./components/BatchCreateOfferForm";

export default function FundingOffers() {
  const { f_currency } = getPreferenceValues();

  const currency = getCurrency();

  const { data: offers = [], isLoading } = useFundingCredits(currency);
  const {
    data: activeOffers = [],
    isLoading: activeOfferLoading,
    mutate: mutateFundingInfo,
  } = useFundingOffers(currency);
  const { data: balanceInfo, isLoading: isBalanceLoading, mutate: mutateBalanceInfo } = useFundingBalanceInfo(currency);

  const [, setCachedActiveOffers] = useCachedActiveOffers(activeOffers);

  useEffect(() => {
    setCachedActiveOffers(activeOffers);
  }, [activeOffers]);

  const availableFunding = useMemo(() => {
    if (balanceInfo) {
      return Math.abs(balanceInfo[0]);
    } else {
      return 0;
    }
  }, [balanceInfo]);

  const totalAmount = useMemo(() => {
    const offerAmount = offers.reduce((acc, offer) => acc + offer.amount, 0);
    const pendingOffersAmount = activeOffers.reduce((acc, offer) => acc + offer.amount, 0);

    return offerAmount + pendingOffersAmount + availableFunding;
  }, [offers]);

  const averageRateByOffers = useMemo(() => {
    if (!offers || offers.length === 0) {
      return 0;
    }

    const averageRate = offers.reduce((acc, offer) => acc + offer.rate * offer.amount, 0) / totalAmount;

    // 20% for the fee
    return averageRate * 0.8;
  }, [offers]);

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
                text: `${availableFunding} ${f_currency}`,
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

                {availableFunding > 0 && (
                  <Action.Push
                    icon={Icon.PlusCircleFilled}
                    title="Batch Create Offers"
                    target={
                      <BatchCreateOfferForm
                        mutateBalanceInfo={mutateBalanceInfo}
                        mutateFundingInfo={mutateFundingInfo}
                        availableFunding={availableFunding}
                      />
                    }
                  />
                )}
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
        {offers
          .sort((a, b) => getOfferClosedDate(a) - getOfferClosedDate(b))
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
