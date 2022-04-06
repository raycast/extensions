import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import dayjs, { Dayjs } from "dayjs";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import suncalc from "suncalc";

export default function main() {
  let lat: number;
  let lng: number;
  const dateArray: Dayjs[] = [];
  // Store sunrise and sunset times in arrays.
  const sunriseArray: Date[] = [];
  const sunsetArray: Date[] = [];

  const [city, setCity] = useState();
  const [country, setCountry] = useState();
  const [sunrise, setSunrise] = useState<Date[]>([]);
  const [sunset, setSunset] = useState<Date[]>([]);
  // Hooks to toggle loading states
  const [locationLoading, setLocationLoading] = useState(true);
  const [timesLoading, setTimesLoading] = useState(true);

  // TODO: Type API response
  /*   interface ILocation {
    lat: number;
    lon: number;
    city: string;
    country: string;
  } */

  // Use IP geolocation API to fetch user's latitude and longitude.
  async function getCurrentLatLong() {
    try {
      // TODO: Remove any type.
      const currentLocation: any = await fetch("http://ip-api.com/json/").then((res) => res.json());
      lat = await currentLocation.lat;
      lng = await currentLocation.lon;
      setCity(await currentLocation.city);
      setCountry(await currentLocation.country);
      setLocationLoading(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch current location using IP geolocation",
        // TODO: Add response.status and additional error info from API as message prop
      });
    }
  }

  // Generate array of dates from now to 2 weeks from now.
  function calculateDates() {
    let currentDate: Dayjs = dayjs();
    // Modify add argument to change range of times calculated.
    const stopDate: Dayjs = dayjs().add(1, "month");

    // Push dates to dateArray.
    while (currentDate <= stopDate) {
      dateArray.push(currentDate);
      currentDate = dayjs(currentDate).add(1, "day");
    }
  }

  // Calculate sunrise / sunset times for dates.
  async function getSunriseSunsetTimes() {
    calculateDates();
    await getCurrentLatLong();

    dateArray.map((date) => {
      // @ts-expect-error: Day.js creates a wrapper for the Date object, hence type valid.
      const times = suncalc.getTimes(date, lat, lng);
      // Push sunrise/sunset times for current date to respective arrays.
      sunriseArray.push(times.sunrise);
      sunsetArray.push(times.sunset);
    });

    setSunrise(sunriseArray);
    setSunset(sunsetArray);

    setTimesLoading(false);
  }

  // Initialise dates before render so that Raycast list is populated.
  calculateDates();

  // Only calculate times on first render, otherwise an infinite loop -> memory leak occurs.
  useEffect(() => {
    getSunriseSunsetTimes();
  }, []);

  return (
    <List
      navigationTitle={
        locationLoading
          ? "Sunrise / sunset times for current location"
          : "Sunrise / sunset times for " + city + ", " + country
      }
    >
      {dateArray.map((date, i) => (
        <List.Item
          key={i}
          title={dayjs(date).format("MMMM D")}
          subtitle={
            timesLoading
              ? "Calculating ..."
              : "☀ " + dayjs(sunrise[i]).format("h:mm:ss A") + "   ☾ " + dayjs(sunset[i]).format("h:mm:ss A")
          }
          actions={
            <ActionPanel title="Copy times">
              <Action.CopyToClipboard
                title="Copy Sunrise Time"
                content={dayjs(date).format("MMMM D") + " | Sunrise: " + dayjs(sunrise[i]).format("h:mm:ss A")}
              />
              <Action.CopyToClipboard
                title="Copy Sunset Time"
                content={dayjs(date).format("MMMM D") + " | Sunset: " + dayjs(sunset[i]).format("h:mm:ss A")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
