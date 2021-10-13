import { List } from "@raycast/api";
import { getIcon, getWindDirectionIcon } from "../icons";
import { WeatherData } from "../wttr";

function getTime(time: string): string {
  const h = parseInt(time) / 100.0;
  const postfix = h < 12 ? "AM" : "PM";
  return `${h} ${postfix}`;
}

export function DayList(props: { day: WeatherData; title: string }) {
  const day = props.day;
  return (
    <List>
      <List.Section title={props.title}>
        {day.hourly.map((data, _) => (
          <List.Item
            key={data.time.toString()}
            title={`${getTime(data.time)}`}
            subtitle={`${data.tempC} °C , ${data.weatherDesc[0].value}`}
            icon={getIcon(data.weatherCode)}
            accessoryTitle={`humidity: ${data.humidity}% | wind: ${data.windspeedKmph} km/h ${getWindDirectionIcon(
              data.winddirDegree
            )}`}
          />
        ))}
      </List.Section>
    </List>
  );
}
