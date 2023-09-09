import { Color, Detail, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { HistoricalDrive } from "./types/HistoricalDrive";
import { getElapsedTime, getFormattedTime } from "./utils/timeUtils";

const BASE_URL = "https://api.tessie.com";

export default function Command() {
  const preferences = getPreferenceValues<{ tessieApiKey: string; VIN: string }>();

  const API_KEY = preferences.tessieApiKey;
  const VIN = preferences.VIN;

  const { isLoading, data } = useFetch<{ results: HistoricalDrive[] }>(`${BASE_URL}/${VIN}/drives`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (isLoading) return <Detail isLoading={true} />;

  if (!data) return <Detail markdown="Failed to fetch historical drives" />;

  return (
    <List isShowingDetail>
      {data.results.map((drive) => (
        <List.Item
          title={getFormattedTime(drive.started_at)}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Time"
                    text={getElapsedTime(drive.started_at, drive.ended_at).replace("0h ", "")}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="From" text={drive.starting_location} />
                  <List.Item.Detail.Metadata.Label title="To" text={drive.ending_location} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Battery"
                    text={`${drive.starting_battery}% - ${drive.ending_battery}% (${drive.odometer_distance} miles)`}
                    icon={{ source: Icon.Battery, tintColor: Color.Green }}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Speed"
                    text={`Average ${drive.average_speed}, Max ${drive.max_speed}`}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Odometer"
                    text={drive.ending_odometer.toLocaleString("en-US") + " miles"}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Total Range Used" text={`Used ${drive.rated_range_used}`} />
                  <List.Item.Detail.Metadata.Label
                    title="Range Efficiency"
                    text={`${Math.round((drive.odometer_distance / drive.rated_range_used) * 100)}%`}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
