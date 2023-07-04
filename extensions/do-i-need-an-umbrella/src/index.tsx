import { useEffect, useState } from "react";
import { Icon, MenuBarExtra } from "@raycast/api";
import fetch from "node-fetch";

type Bookmark = { name: string; url: string };

let timezone = "";
let lastupdate = "";

const DEF_DELAY = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms || DEF_DELAY));
}

function formatUnixTimestamp(timestamp: number) {
  const date = new Date(timestamp * 1000);
  const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
  const dayOfMonth = date.toLocaleDateString("en-US", { day: "numeric" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  return `${dayOfWeek} ${dayOfMonth} ${month}`;
}

const useBookmarks = () => {
  const [state, setState] = useState<{ unseen: Bookmark[]; isLoading: boolean; error: string }>({
    unseen: [],
    isLoading: true,
    error: "",
  });

  let mounted = true;
  useEffect(() => {
    let retries = 0;
    const maxRetries = 10;

    const fetchBookmarks = async () => {
      try {
        await sleep(2000);
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
        const needLongSleeve = maxTemperature < 23 || minTemperature < 18;
        const needJacket = maxTemperature < 20 || minTemperature < 15;
        timezone = data.timezone;
        const lastupdateunix = data.daily.time;
        lastupdate = formatUnixTimestamp(lastupdateunix);

        const bookmarks: Bookmark[] = [
          { name: needUmbrella ? "Bring an umbrella" : "No umbrella needed", url: "" },
          { name: needLongSleeve ? "Wear a long sleeve shirt" : "Wear a short sleeve shirt", url: "" },
          { name: needJacket ? "Wear a jacket" : "No jacket needed", url: "" },
        ];

        if (mounted) {
          setState({ unseen: bookmarks, isLoading: false, error: "" });
        }
      } catch (error) {
        console.error("Failed to fetch bookmarks:", error);
        if (retries < maxRetries) {
          retries++;
          await sleep(5000);
          fetchBookmarks();
        } else {
          if (mounted) {
            setState({ unseen: [], isLoading: false, error: "Error" });
          }
        }
      }
    };

    fetchBookmarks();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
};

export default function Command() {
  const { unseen, isLoading, error } = useBookmarks();

  if (isLoading) {
    return <MenuBarExtra icon={Icon.CloudRain} isLoading={true} />;
  }

  if (error) {
    console.log("Error, Trying again!");
  }

  return (
    <MenuBarExtra icon={Icon.CloudRain}>
      {unseen.map((bookmark, index) => (
        <MenuBarExtra.Item
          key={index}
          icon={
            bookmark.name.includes("umbrella")
              ? Icon.Umbrella
              : bookmark.name.includes("jacket")
              ? Icon.Building
              : Icon.Person
          }
          title={bookmark.name}
        />
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item key={"27"} icon={Icon.Clock} title={lastupdate} />
        <MenuBarExtra.Item key={timezone} icon={Icon.Globe} title={timezone} />
        <MenuBarExtra.Item key={"25"} icon={Icon.Heart} title={"Made with ❤️ by EliasK"} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
