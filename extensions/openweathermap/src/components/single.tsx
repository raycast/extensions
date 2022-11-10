import { List } from "@raycast/api";
import { ReactElement } from "react";
import { getWindDirectionIcon } from "../lib/icons";
import { Current, Daily, getIconURL, Hourly } from "../lib/openweathermap";
import { getTemperatureUnit, getWindUnit } from "../lib/unit";
import { getHour, unixTimestampToDate } from "../lib/utils";

export function CurrentDetailList(props: { weather: Current }): ReactElement {
  const c = props.weather;
  return (
    <List>
      <List.Item
        title="Condition"
        icon={getIconURL(c.weather[0].icon)}
        accessories={[{ text: `${c.weather[0].description}` }]}
      />
      <List.Item title="Temperature" icon="🌡️" accessories={[{ text: `${c.temp} ${getTemperatureUnit()}` }]} />
      <List.Item title="Humidity" icon="💧" accessories={[{ text: `${c.humidity} %` }]} />
      <List.Item title="Pressure" icon="📈" accessories={[{ text: `${c.pressure} hPa` }]} />
      <List.Item
        title="Wind"
        icon="💨"
        accessories={[{ text: `${c.wind_speed} ${getWindUnit()} ${getWindDirectionIcon(c.wind_deg)}` }]}
      />
      <List.Item title="UV-Index" icon="☀️" accessories={[{ text: `${c.uvi}` }]} />
      <List.Item title="Dew Point" icon="🌫️" accessories={[{ text: `${c.dew_point} ${getTemperatureUnit()}` }]} />
    </List>
  );
}

export function HourlyDetailList(props: { hourly: Hourly }): ReactElement {
  const h = props.hourly;
  return (
    <List>
      <List.Item
        title="Condition"
        icon={getIconURL(h.weather[0].icon)}
        accessories={[{ text: `${h.weather[0].description}` }]}
      />
      <List.Item title="Temperature" icon="🌡️" accessories={[{ text: `${h.temp} ${getTemperatureUnit()}` }]} />
      <List.Item title="Humidity" icon="💧" accessories={[{ text: `${h.humidity} %` }]} />
      <List.Item title="Pressure" icon="📈" accessories={[{ text: `${h.pressure} hPa` }]} />
      <List.Item
        title="Wind"
        icon="💨"
        accessories={[{ text: `${h.wind_speed} ${getWindUnit()} ${getWindDirectionIcon(h.wind_deg)}` }]}
      />
      <List.Item title="UV-Index" icon="☀️" accessories={[{ text: `${h.uvi}` }]} />
      <List.Item title="Dew Point" icon="🌫️" accessories={[{ text: `${h.dew_point} ${getTemperatureUnit()}` }]} />
    </List>
  );
}

export function DailyDetailList(props: { daily: Daily }): ReactElement {
  const d = props.daily;
  return (
    <List>
      <List.Item
        title="Condition"
        icon={getIconURL(d.weather[0].icon)}
        accessories={[{ text: `${d.weather[0].description}` }]}
      />
      <List.Item
        title="Temperature"
        icon="🌡️"
        accessories={[
          { text: `${d.temp.morn} ${getTemperatureUnit()}`, tooltip: "Morning" },
          { text: `${d.temp.day} ${getTemperatureUnit()}`, tooltip: "Day" },
          { text: `${d.temp.eve} ${getTemperatureUnit()}`, tooltip: "Evening" },
          { text: `${d.temp.night} ${getTemperatureUnit()}`, tooltip: "Night" },
        ]}
      />
      <List.Item title="Humidity" icon="💧" accessories={[{ text: `${d.humidity} %` }]} />
      <List.Item title="Pressure" icon="📈" accessories={[{ text: `${d.pressure} hPa` }]} />
      <List.Item
        title="Wind"
        icon="💨"
        accessories={[{ text: `${d.wind_speed} ${getWindUnit()} ${getWindDirectionIcon(d.wind_deg)}` }]}
      />
      <List.Item title="UV-Index" icon="☀️" accessories={[{ text: `${d.uvi}` }]} />
      <List.Item title="Dew Point" icon="🌫️" accessories={[{ text: `${d.dew_point} ${getTemperatureUnit()}` }]} />
      <List.Item title="Sunrise" icon="🌅" accessories={[{ text: `${getHour(unixTimestampToDate(d.sunrise))}` }]} />
      <List.Item title="Sunset" icon="🌇" accessories={[{ text: `${getHour(unixTimestampToDate(d.sunset))}` }]} />
    </List>
  );
}
