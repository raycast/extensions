import displayNotification from "display-notification";
import { calcAvailableBalance } from "../api";
import { getCurrency, getSound } from "../preference";
import { MINIMUM_OFFER_AMOUNT } from "../contants";

export async function checkAvailableFunding() {
  const currency = getCurrency();

  const balanceInfo = await calcAvailableBalance(currency);

  const availableFunding = (() => {
    if (balanceInfo) {
      return Math.abs(balanceInfo[0]);
    } else {
      return 0;
    }
  })();

  if (availableFunding > MINIMUM_OFFER_AMOUNT) {
    await displayNotification({
      title: `Available Funding for ${currency}`,
      subtitle: `You have ${availableFunding} ${currency} available for lending`,
      sound: getSound(),
    });
  }
}
