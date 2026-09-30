import { calcAvailableBalance } from "../api";
import { getCurrency } from "../preference";

export async function getAvailableFunding() {
  const currency = getCurrency();

  const balanceInfo = await calcAvailableBalance(currency);

  const availableFunding = (() => {
    if (balanceInfo) {
      return Math.abs(balanceInfo[0]);
    } else {
      return 0;
    }
  })();

  return availableFunding;
}
