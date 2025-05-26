import { Detail } from "@raycast/api";
import { OpenF1WeatherDataPoint, OpenF1Session } from "./current-session"; // Assuming interfaces are exported or defined here

interface WeatherDetailViewProps {
  weatherData: OpenF1WeatherDataPoint[]; // Will still receive all, but only use the latest
  sessionInfo: OpenF1Session | null;
}

export default function WeatherDetailView({ weatherData, sessionInfo }: WeatherDetailViewProps) {
  const title = sessionInfo ? `Latest Weather: ${sessionInfo.session_name}` : "Latest Weather";

  if (!weatherData || weatherData.length === 0) {
    return <Detail markdown={`# ${title}\n\nNo weather data available.`} />;
  }

  const latestReport = weatherData[0]; // Already sorted newest first

  const markdown = `
# ${title}
Last Updated: ${new Date(latestReport.date).toLocaleTimeString()}

| Attribute         | Value                                                    |
|-------------------|----------------------------------------------------------|
| **Air Temperature** | ${latestReport.air_temperature ?? "N/A"}°C                               |
| **Track Temperature** | ${latestReport.track_temperature ?? "N/A"}°C                             |
| **Humidity**        | ${latestReport.humidity ?? "N/A"}%                                        |
| **Rainfall**        | ${latestReport.rainfall === 1 ? "Yes" : latestReport.rainfall === 0 ? "No" : "N/A"} |
| **Wind Speed**      | ${latestReport.wind_speed ?? "N/A"} m/s                                   |
| **Wind Direction**  | ${latestReport.wind_direction ?? "N/A"}°                                  |
| **Pressure**        | ${latestReport.pressure ?? "N/A"} mbar                                    |
`;

  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      metadata={
        sessionInfo ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Session" text={sessionInfo.session_name} />
            <Detail.Metadata.Label title="Location" text={sessionInfo.location} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Report Time" text={new Date(latestReport.date).toLocaleString()} />
          </Detail.Metadata>
        ) : null
      }
    />
  );
}
