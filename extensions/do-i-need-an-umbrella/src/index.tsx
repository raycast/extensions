import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, open } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import fetch from "node-fetch";

type Bookmark = { name: string; url: string };

const useBookmarks = () => {
  const [state, setState] = useState<{ unseen: Bookmark[]; isLoading: boolean }>({
    unseen: [],
    isLoading: true,
  });

  useEffect(() => {
    const fetchBookmarks = async () => {
      const lonlat = await fetch(`http://ip-api.com/json/?fields=lat,lon`);
      const datatlonlat = await lonlat.json();
      const lon = datatlonlat.lon;
      const lat = datatlonlat.lat;
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

      setState({ unseen: bookmarks, isLoading: false });
    };

    fetchBookmarks();
  }, []);

  return state;
};

export default function Command() {
  const { unseen, isLoading } = useBookmarks();

  if (isLoading) {
    return <MenuBarExtra icon={Icon.CloudRain} isLoading={true} />;
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
