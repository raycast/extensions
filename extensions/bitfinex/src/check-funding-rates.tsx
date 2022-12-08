import displayNotification from "display-notification";
import fetch from "cross-fetch";
import { candlesTimeFrame } from "./lib/lendingRatesUtils";
import { getCurrency, getSound } from "./lib/preference";

export default async function run() {
  const _15mCandels = candlesTimeFrame["15m"];

  const data = await fetch(_15mCandels).then((r) => r.json());

  const [dateString, , rawAverageRate] = data[0];

  const date = new Date(dateString);

  const averageRate = rawAverageRate * 365 * 100;

  if (averageRate < 24) {
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
