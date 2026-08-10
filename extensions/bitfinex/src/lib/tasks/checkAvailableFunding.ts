import displayNotification from "display-notification";
import { getCurrency, getSound } from "../preference";
import { MINIMUM_OFFER_AMOUNT } from "../constants";
import { getAvailableFunding } from "./utils";

export async function checkAvailableFunding() {
  const currency = getCurrency();
  const availableFunding = await getAvailableFunding();

  if (availableFunding > MINIMUM_OFFER_AMOUNT) {
    await displayNotification({
      title: `Available Funding for ${currency}`,
      subtitle: `You have ${availableFunding} ${currency} available for lending`,
      sound: getSound(),
    });
  }
}
