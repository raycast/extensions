import { formatLocationCountry, formatPace, formatRunTime, titleForRun } from "../util/utils";
import { List } from "@raycast/api";
import { Activity } from "../type";

export const StatMetadata = ({ activity }: { activity: Activity }) => {
  const distance = (activity.distance / 1000.0).toFixed(2);
  const paceParts = activity.average_speed ? formatPace(activity.average_speed) : null;
  const heartRate = activity.average_heartrate;
  const runTime = formatRunTime(activity.moving_time);

  const title = titleForRun(activity);
  const locationCountry = formatLocationCountry(activity.location_country);

  const paceTitle = `${["run", "swim"].includes(activity.type.toLowerCase()) ? "Pace" : "Speed"}`;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Type" text={title} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Distance" text={`${distance} KM`} />
      <List.Item.Detail.Metadata.Label title={`${paceTitle}`} text={paceParts ? paceParts : ""} />
      <List.Item.Detail.Metadata.Label title="Heart Rate" text={heartRate ? `${heartRate.toFixed(0)} BPM` : "-"} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Run Time" text={runTime} />
      <List.Item.Detail.Metadata.Label title="Date" text={activity.start_date_local} />
      <List.Item.Detail.Metadata.Label title="Location" text={locationCountry} />
    </List.Item.Detail.Metadata>
  );
};
