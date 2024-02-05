import { updateCommandMetadata, environment } from "@raycast/api";
import fetch from "node-fetch";

type Event = {
  title: string;
  date: string;
};

type BankHoliday = {
  "england-and-wales": {
    events: Event[];
  };
};

async function fetchNextBankHoliday() {
  const response = await fetch("https://www.gov.uk/bank-holidays.json");
  const data = (await response.json()) as BankHoliday;

  const holidays = data["england-and-wales"].events;

  const today = new Date();
  const futureHolidays = holidays.filter((holiday) => new Date(holiday.date) > today);

  const nextHoliday = futureHolidays[0]; // getting the first holiday only

  return nextHoliday;
}

export default async function Command() {
  console.log("launchType", environment.launchType);

  const nextHoliday = await fetchNextBankHoliday();

  await updateCommandMetadata({
    subtitle: `${nextHoliday.title}, ${new Date(nextHoliday.date).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
  });
}
