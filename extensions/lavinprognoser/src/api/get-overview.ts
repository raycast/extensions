import { getPreferenceValues } from "@raycast/api";
import { Forecast } from "../types";
import { getAreaSlug } from "../utils";

const getUrl = () => {
  const language = getPreferenceValues().language;
  if (language === "en") {
    return `https://lavinprognoser.se/en.json`;
  }

  return `https://lavinprognoser.se/index.json`;
};

export const getOverview = async () => {
  try {
    const response = await fetch(getUrl());
    const data = await response.json();

    const forecast = data.content.areaPageLinksArea as Forecast;
    const forecastValidity = forecast.validToDate;
    const forecastAreas = forecast.areaPageLinks.map((area) => {
      return {
        ...area,
        slug: getAreaSlug(area.url),
      };
    });
    return {
      forecastValidity,
      forecastAreas,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};
