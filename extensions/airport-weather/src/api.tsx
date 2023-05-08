import got from "got";
import { showToast, Toast } from "@raycast/api";
import { XMLParser } from "fast-xml-parser";

export async function fetchMetar(airportCode: string) {
  try {
    const response = await got("https://www.aviationweather.gov/adds/dataserver_current/httpparam", {
      searchParams: {
        dataSource: "metars",
        requestType: "retrieve",
        format: "xml",
        stationString: airportCode.toUpperCase(),
        hoursBeforeNow: 1,
        mostRecent: true,
      },
    });
    const parser = new XMLParser();
    const jsonData = parser.parse(response.body);
    const metar = jsonData.response.data?.METAR;
    return metar;
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Wrong Code", message: "The airport code is not valid." });
  }
}

export async function fetchStation(airportCode: string) {
  try {
    const response = await got("https://www.aviationweather.gov/adds/dataserver_current/httpparam", {
      searchParams: {
        dataSource: "stations",
        requestType: "retrieve",
        format: "xml",
        stationString: airportCode.toUpperCase(),
      },
    });
    const parser = new XMLParser();
    const jsonData = parser.parse(response.body);
    const station = jsonData.response.data?.Station;
    return station;
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Wrong Code", message: "The airport code is not valid." });
  }
}
