import { useEffect, useState } from "react";
import { Icon, MenuBarExtra } from "@raycast/api";
import fetch from "node-fetch";

type Bookmark = { name: string; url: string };

const useBookmarks = () => {
  const [state, setState] = useState<{ unseen: Bookmark[]; isLoading: boolean; error: string }>({
    unseen: [],
    isLoading: true,
    error: "",
  });

  useEffect(() => {
    let retries = 0;
    const maxRetries = 5;

    const fetchBookmarks = async () => {
      try {
        const lonlatResponse = await fetch(`http://ip-api.com/json/?fields=lat,lon`);
        const lonlatData = await lonlatResponse.json();
        const lon = lonlatData.lon;
        const lat = lonlatData.lat;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,uv_index_clear_sky_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration&timeformat=unixtime&timezone=auto&forecast_days=1`;
        const response = await fetch(url);
        const data = await response.json();
        const precipitation = data.daily.precipitation_sum[0];
        const needUmbrella = precipitation >= 0.2;
        const maxTemperature = data.daily.temperature_2m_max[0];
        const minTemperature = data.daily.temperature_2m_min[0];
        const needLongSleeve = maxTemperature < 20 || minTemperature < 15;

        const bookmarks: Bookmark[] = [
          { name: needUmbrella ? "Bring an umbrella" : "No umbrella needed", url: "" },
          { name: needLongSleeve ? "Wear a long sleeve shirt" : "Wear a short sleeve shirt", url: "" },
        ];

        setState({ unseen: bookmarks, isLoading: false, error: "" });
      } catch (error) {
        console.error("Failed to fetch bookmarks:", error);
        if (retries < maxRetries) {
          retries++;
          setTimeout(fetchBookmarks, 5000); // retry after 5 seconds
        } else {
          setState({ unseen: [], isLoading: false, error: "Error fetching bookmarks" });
        }
      }
    };

    fetchBookmarks();
  }, []);

  return state;
};

export default function Command() {
  const { unseen, isLoading, error } = useBookmarks();

  if (isLoading) {
    return <MenuBarExtra icon={Icon.CloudRain} isLoading={true} />;
  }

  if (error) {
    console.log("Error, Trying again!")
  }

  return (
    <MenuBarExtra icon={Icon.CloudRain}>
      {unseen.map((bookmark, index) => (
        <MenuBarExtra.Item
          key={index}
          icon={bookmark.name.includes("umbrella") ? Icon.Umbrella : Icon.Person}
          title={bookmark.name}
        />
      ))}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item key={"25"} icon={Icon.Heart} title={"Made with ❤️ by EliasK"} />
    </MenuBarExtra>
  );
}
