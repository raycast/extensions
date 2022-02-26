import { List } from "@raycast/api";
import { getIcon, getWindDirectionIcon } from "../icons";
import { getWindUnit, getTemperatureUnit, getWttrTemperaturePostfix, getWttrWindPostfix } from "../unit";
import { Hourly, WeatherData } from "../wttr";

function getTime(time: string): string {
  const h = parseInt(time) / 100.0;
  const postfix = h < 12 ? "AM" : "PM";
  return `${h} ${postfix}`;
}

export function DayList(props: { day: WeatherData; title: string }) {
  const day = props.day;

  const getWeatherDesc = (hour: Hourly): string => {
    try {
      return hour.weatherDesc[0].value;
    } catch (e: any) {
      return "?";
    }
  };

  const getWind = (hour: Hourly): string => {
    const data = hour as Record<string, any>;
    const key = `windspeed${getWttrWindPostfix()}`;
    let val = "?";
    if (data[key]) {
      val = data[key] || "?";
    }
    return `${val} ${getWindUnit()}`;
  };

  const getTemp = (hour: Hourly): string => {
    const data = hour as Record<string, any>;
    const key = `temp${getWttrTemperaturePostfix()}`;
    let val = "?";
    if (data[key]) {
      val = data[key] || "?";
    }
    return `${val} ${getTemperatureUnit()}`;
  };

  return (
    <List>
      <List.Section title={props.title}>
        {day.hourly.map((data) => (
          <List.Item
            key={data.time.toString()}
            title={`${getTime(data.time)}`}
            subtitle={`${getTemp(data)} , ${getWeatherDesc(data)}`}
            icon={getIcon(data.weatherCode)}
            accessoryTitle={`humidity: ${data.humidity}% | wind: ${getWind(data)} ${getWindDirectionIcon(
              data.winddirDegree
            )}`}
          />
        ))}
      </List.Section>
    </List>
  );
}
