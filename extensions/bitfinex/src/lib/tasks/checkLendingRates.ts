import displayNotification from "display-notification";
import fetch from "cross-fetch";
import { candlesTimeFrame } from "../lendingRatesUtils";
import { getCurrency, getHighRateThreshold, getSound } from "../preference";

export async function checkLendingRates() {
  const _15mCandles = candlesTimeFrame["15m"];

  const data = await fetch(_15mCandles).then((r) => r.json());

  const [dateString, , rawAverageRate] = data[0];

  const date = new Date(dateString);

  const averageRate = rawAverageRate * 365 * 100;

  const threshold = getHighRateThreshold();
  if (averageRate <= threshold) {
    return;
  }

  const averageDailyRate = `${(rawAverageRate * 100).toFixed(4)}%`;
  const averageYearlyRate = `${averageRate.toFixed(2)}%`;

  await displayNotification({
    title: `Lending Rates for ${getCurrency()}`,
    subtitle: `${date.toLocaleString()}`,
    text: `${averageDailyRate}, (${averageYearlyRate} yearly)`,
    sound: getSound(),
  });
}
