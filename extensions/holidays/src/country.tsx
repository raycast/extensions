import { List } from "@raycast/api";
import moment from "moment";
import fetch, { AbortError } from "node-fetch";
import { useEffect, useState } from "react";

type Holiday = {
  date: Date;
  name: string;
  country: {
    name: string;
    emoji: string;
  };
};

const buildMarkdown = (holidays: Holiday[] | null) => {
  if (!holidays) {
    return "";
  }
  const markdown = holidays
    .map((holiday) => {
      const { date, name } = holiday;
      return `
### ${name}

${moment(date).format("dddd, MMMM Do")} (${moment(date).fromNow()})

`;
    })
    .join("\n\n");
  return markdown;
};

export const Country = ({ countryCode }: { countryCode: string }) => {
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);

  useEffect(() => {
    let isComponentMounted = true;
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        const response = await fetch(`https://askholidays.vercel.app/api/holiday-country?country=${countryCode}`, {
          signal,
        });
        const data = (await response.json()) as Holiday[];
        if (isComponentMounted) {
          setHolidays(data);
        }
      } catch (error) {
        if (!(error instanceof AbortError)) {
          console.error(error);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
      isComponentMounted = false;
    };
  }, [countryCode]);

  return <List.Item.Detail isLoading={!holidays} markdown={buildMarkdown(holidays)} />;
};
