import { getPrayerTime } from "./utils/prayerTimes";

export default async function command() {
  await getPrayerTime("Isha");
}
