import { Detail } from "@raycast/api";
import { Track } from "./types/common";
import { formatDate, getTrackCondition, getTrackStatus } from "./utils";

export function TrackDetails({ track }: { track: Track }) {
  const location = `${track.service.name} / ${track.service.country}`;
  const condition = getTrackCondition({ track });
  const status = getTrackStatus({ track });
  const description = `# ${track.name}
  
${track.description ?? "No further details"}
`;
  return (
    <Detail
      markdown={description}
      navigationTitle={track.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Location" text={location} />
          <Detail.Metadata.Label title="Type" text={track.type} />
          <Detail.Metadata.Label title="Maintenance Date" text={formatDate(track.maintenanceDate)} />
          <Detail.Metadata.Label
            title="Expected condition"
            text={condition.text}
            icon={{
              source: condition.icon,
              tintColor: condition.color,
            }}
          />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={status.text} color={status.color} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
