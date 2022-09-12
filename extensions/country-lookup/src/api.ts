import useSWR from "swr";
import fetch from "node-fetch";
import { Country } from "./interface";

export function getData() {
  return useSWR("countries", async (): Promise<Country[]> => {
    const response = await fetch("https://restcountries.com/v3.1/all");
    return response.json() as Promise<Country[]>;
  });
}
