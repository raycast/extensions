import { List } from "@raycast/api";
import { StationData } from "../types";

export default function StationDetails(props: { stationName: string; data: StationData; tags: JSX.Element[] }) {
  const { stationName, data, tags } = props;
  return (
    <List.Item.Detail
      markdown={`# ${stationName}
${data.description == "" ? "No Description" : "Description:"}

    ${data.description}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Genres">{tags}</List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Links" />
          <List.Item.Detail.Metadata.Link title="Website" text={data.website} target={data.website} />
          <List.Item.Detail.Metadata.Link title="Stream" text={data.stream} target={data.stream} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
