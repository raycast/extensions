import { useEffect, useState } from "react";
import { ActionPanel, Action, List } from "@raycast/api";
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

async function fetchBankHolidays() {
  const response = await fetch("https://www.gov.uk/bank-holidays.json");
  const data = (await response.json()) as BankHoliday;

  const holidays = data["england-and-wales"].events;

  const today = new Date();
  const futureHolidays = holidays.filter((holiday) => new Date(holiday.date) > today);

  return futureHolidays;
}

export default function Command() {
  const [holidays, setHolidays] = useState<Event[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const holidayData = await fetchBankHolidays();
      setHolidays(holidayData);
    };

    fetchData();
  }, []);

  return (
    <List isLoading={holidays.length === 0}>
      {holidays.map((holiday) => (
        <List.Item
          key={holiday.date}
          title={holiday.title}
          subtitle={new Date(holiday.date).toLocaleDateString("en-GB", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Event Date" content={holiday.date} />
              <Action.OpenInBrowser url={`https://www.gov.uk/bank-holidays`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
