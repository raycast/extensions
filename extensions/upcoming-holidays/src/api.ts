import fetch from "node-fetch";
import { Fetcher } from "swr";

export type Holiday = {
  date: Date;
  name: string;
  country: {
    name: string;
    emoji: string;
  };
};

const getHolidays = async (countryCode: string): Promise<Holiday[]> => {
  const response = await fetch(`https://askholidays.vercel.app/api/holiday-country?country=${countryCode}`);
  const data = (await response.json()) as Holiday[];
  return data;
};

export const fetcher: Fetcher<Holiday[], string> = (countryCode) => getHolidays(countryCode);
