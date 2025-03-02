import { getPreferenceValues } from "@raycast/api";
import { DetailedArea } from "../types";

const getUrl = (slug: string) => {
  const language = getPreferenceValues().language;
  if (language === "en") {
    return `https://lavinprognoser.se/en/area-overview/${slug}.json`;
  }
  return `https://lavinprognoser.se/oversikt-alla-omraden/${slug}.json`;
};

export const getForecast = async (slug: string) => {
  try {
    const response = await fetch(getUrl(slug));
    const data = await response.json();

    const content = data.content as DetailedArea;
    return content;
  } catch (error) {
    console.error(error);
    return null;
  }
};
