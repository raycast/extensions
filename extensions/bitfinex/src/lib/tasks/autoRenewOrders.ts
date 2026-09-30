import displayNotification from "display-notification";
import { FundingOffer } from "bfx-api-node-models";

import { getCurrency } from "../preference";
import { getCachedActiveOffers, setCachedActiveOffers } from "../utils";
import { getAvailableFunding } from "./utils";
import { getFundingOffers, rest } from "../api";

export async function autoRenewOrders() {
  const currency = getCurrency();

  const availableFunding = await getAvailableFunding();
  const activeOffers = await getFundingOffers(currency);

  const cachedActiveOffers = getCachedActiveOffers();

  const cachedAmount = cachedActiveOffers.reduce((acc, offer) => acc + offer.amount, 0);

  const canPlaceOffer = availableFunding > cachedAmount;

  if (activeOffers.length === 0 && canPlaceOffer && cachedActiveOffers.length > 0) {
    // batch submit existing offers

    const payloads = cachedActiveOffers.map((offer) => {
      return {
        type: "LIMIT",
        symbol: offer.symbol,
        rate: offer.rate,
        amount: offer.amount,
        period: offer.period,
      };
    });

    try {
      await Promise.all(payloads.map((offer) => rest.submitFundingOffer(new FundingOffer(offer))));

      // update cache
      const newOffers = await getFundingOffers(currency);
      setCachedActiveOffers(newOffers);

      await displayNotification({
        title: `Renewed ${currency} offers`,
        subtitle: `Renewed ${cachedActiveOffers.length} offers`,
      });
    } catch (e) {
      console.error(e);
    }
  } else {
    // simply update cache

    setCachedActiveOffers(activeOffers);
  }
}
