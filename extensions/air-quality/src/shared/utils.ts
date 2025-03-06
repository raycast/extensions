import { AxiosResponse } from "axios";
import dayjs from "./dayjs";
import { AirQualityData, PollutionLevelAndImplication } from "./types";

export function extractErrorMessage(response: AxiosResponse): string {
  if (!response.data) {
    return response.status !== 200 ? `Error code: ${response.status}` : "Unknown error";
  }

  return response.data?.msg || response.data?.data || response.data?.data?.msg || "Unknown error";
}

export function cleanCityName(cityName?: string): string {
  return cityName
    ? cityName
        .toLowerCase()
        .replace(/\s/g, "")
        .replace(/@/g, "A")
        .replace("https://aqicn.org/city/", "")
        .replace("https://aqicn.org/station/", "")
        .replace(/^\//, "")
        .replace(/\/$/, "")
    : "here";
}

export function getPollutionLevelAndImplication(aqi: number): PollutionLevelAndImplication {
  if (aqi <= 50) {
    return {
      level: 0,
      levelName: "Good",
      implication: "Air quality is considered satisfactory, and air pollution poses little or no risk.",
    };
  } else if (aqi >= 51 && aqi <= 100) {
    return {
      level: 1,
      levelName: "Moderate",
      implication:
        "Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.",
    };
  } else if (aqi >= 101 && aqi <= 150) {
    return {
      level: 2,
      levelName: "Unhealthy for Sensitive Groups",
      implication:
        "Members of sensitive groups may experience health effects. The general public is not likely to be affected.",
    };
  } else if (aqi >= 151 && aqi <= 200) {
    return {
      level: 3,
      levelName: "Unhealthy",
      implication:
        "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.",
    };
  } else if (aqi >= 201 && aqi <= 300) {
    return {
      level: 4,
      levelName: "Very Unhealthy",
      implication: "Health warnings of emergency conditions. The entire population is more likely to be affected.",
    };
  } else {
    return {
      level: 5,
      levelName: "Hazardous",
      implication: "Health alert: everyone may experience more serious health effects.",
    };
  }
}

export function getForecastRecords(data: AirQualityData) {
  return data.forecast
    ? data.forecast.daily.pm25
        .map((record) => ({
          ...record,
          day: dayjs(record.day),
          pollution: getPollutionLevelAndImplication(record.avg),
        }))
        .filter((record) => dayjs().isBefore(record.day, "day"))
        .map((record) => ({
          ...record,
          day: record.day.format("dddd, MMMM D"),
        }))
    : [];
}
