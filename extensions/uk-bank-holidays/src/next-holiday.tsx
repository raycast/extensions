import { useEffect, useState } from "react";
import { ActionPanel, Action, Detail } from "@raycast/api";
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

export default function Command() {
  const [nextHoliday, setNextHoliday] = useState<Event | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const holidayData = await fetchNextBankHoliday();
      setNextHoliday(holidayData);
    };

    fetchData();
  }, []);

  return nextHoliday ? (
    <Detail
      markdown={`# ${nextHoliday.title}\n\n${new Date(nextHoliday.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Event Date" content={nextHoliday.date} />
          <Action.OpenInBrowser url={`https://www.gov.uk/bank-holidays`} />
        </ActionPanel>
      }
    />
  ) : (
    <Detail isLoading={true} />
  );
}
