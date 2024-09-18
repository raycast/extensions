import { Color, List } from "@raycast/api";
import { WeatherIcons, getWeatherCodeIcon, getWindDirectionIcon } from "../icons";
import { getTemperatureUnit, getWindUnit, getWttrTemperaturePostfix, getWttrWindPostfix } from "../unit";
import { clockFormat } from "../utils";
import { Hourly, WeatherData, getHourlyCloudCover, getHourlyRain, getHourlyThunder } from "../wttr";

function getTime(time: string): string {
  const t = parseInt(time);
  const h = t / 100.0;
  const m = t % 100;
  if (clockFormat() === "24h") {
    return new Date(2000, 1, 1, h, m).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else {
    const postfix = h < 12 ? "AM" : "PM";
    return `${h} ${postfix}`;
  }
}

export function DayList(props: { day: WeatherData; title: string; isLoading?: boolean }): JSX.Element {
  const day = props.day;

  const getWeatherDesc = (hour: Hourly): string => {
    try {
      return hour.weatherDesc[0].value;
    } catch (e: unknown) {
      return "?";
    }
  };

  const getWind = (hour: Hourly): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = hour as Record<string, any>;
    const key = `windspeed${getWttrWindPostfix()}`;
    let val = "?";
    if (data[key]) {
      val = data[key] || "?";
    }
    return `${val} ${getWindUnit()}`;
  };

  const getTemp = (hour: Hourly): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = hour as Record<string, any>;
    const key = `temp${getWttrTemperaturePostfix()}`;
    let val = "?";
    if (data[key]) {
      val = data[key] || "?";
    }
    return `${val} ${getTemperatureUnit()}`;
  };

  const getWindText = (hour: Hourly) => {
    return `${getWind(hour)} ${getWindDirectionIcon(hour.winddirDegree)} (${hour.winddir16Point})`;
  };

  const getHumidityText = (hour: Hourly) => {
    return `${hour.humidity}%`;
  };

  return (
    <List isLoading={props.isLoading}>
      <List.Section title={props.title}>
        {day.hourly.map((data) => {
          const cloudCover = getHourlyCloudCover(data);
          const rain = getHourlyRain(data);
          const isRain = rain && rain.value > 0;
          const thunder = getHourlyThunder(data);
          const isThunder = thunder && thunder.value > 0;
          return (
            <List.Item
              key={data.time.toString()}
              title={`${getTime(data.time)}`}
              subtitle={`${getTemp(data)}     ${getWeatherDesc(data)}`}
              icon={{ value: getWeatherCodeIcon(data.weatherCode), tooltip: getWeatherDesc(data) }}
              accessories={[
                {
                  text: isThunder ? thunder.valueAndUnit : undefined,
                  icon: isThunder ? WeatherIcons.Thunder : undefined,
                  tooltip: isThunder ? `Change of Thunder ${thunder.valueAndUnit}` : undefined,
                },
                {
                  text: isRain ? rain.valueAndUnit : undefined,
                  icon: isRain ? WeatherIcons.Rain : undefined,
                  tooltip: isRain ? `Rain ${rain.valueAndUnit} (Chance ${rain.chanceOfRain}%)` : undefined,
                },
                {
                  icon: { source: WeatherIcons.Wind, tintColor: Color.SecondaryText },
                  text: getWindText(data),
                  tooltip: `Wind: ${getWindText(data)}`,
                },
                {
                  text: cloudCover ? cloudCover.valueAndUnit : undefined,
                  icon: cloudCover ? WeatherIcons.Cloud : undefined,
                  tooltip: cloudCover ? `Cloud Cover: ${cloudCover.valueAndUnit}` : undefined,
                },
                {
                  icon: day.uvIndex ? WeatherIcons.UVIndex : undefined,
                  tooltip: day.uvIndex ? `UV Index: ${day.uvIndex}` : undefined,
                },
                {
                  icon: { source: WeatherIcons.Humidity, tintColor: Color.SecondaryText },
                  text: getHumidityText(data),
                  tooltip: `Humidity: ${getHumidityText(data)}`,
                },
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
