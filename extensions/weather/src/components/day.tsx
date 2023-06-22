import { List } from "@raycast/api";
import { getWeatherCodeIcon, getWindDirectionIcon } from "../icons";
import { getWindUnit, getTemperatureUnit, getWttrTemperaturePostfix, getWttrWindPostfix } from "../unit";
import { Hourly, WeatherData } from "../wttr";

function getTime(time: string): string {
  const h = parseInt(time) / 100.0;
  const postfix = h < 12 ? "AM" : "PM";
  return `${h} ${postfix}`;
}

export function DayList(props: { day: WeatherData; title: string }): JSX.Element {
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

  const getWindText = (hour: Hourly) => {
    return `${getWind(hour)} ${getWindDirectionIcon(hour.winddirDegree)}`;
  };

  const getHumidityText = (hour: Hourly) => {
    return `${hour.humidity}%`;
  };

  return (
    <List>
      <List.Section title={props.title}>
        {day.hourly.map((data) => (
          <List.Item
            key={data.time.toString()}
            title={`${getTime(data.time)}`}
            subtitle={`${getTemp(data)}     ${getWeatherDesc(data)}`}
            icon={{ value: getWeatherCodeIcon(data.weatherCode), tooltip: "test" }}
            accessories={[
              {
                icon: "💧",
                text: getHumidityText(data),
                tooltip: `Humidity: ${getHumidityText(data)}`,
              },
              {
                icon: "💨",
                text: getWindText(data),
                tooltip: `Wind: ${getWindText(data)}`,
              },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
