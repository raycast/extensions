import { Fragment } from "react";
import { Color, List } from "@raycast/api";
import { formatDateTime } from "../utils";

function RaceSessionDetails({ title, raceDates }: { title: string; raceDates: [string, Date][] }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={`${title} Sessions`} />
          <List.Item.Detail.Metadata.Separator />
          {raceDates.map(([title, date], index) => (
            <Fragment key={index}>
              <List.Item.Detail.Metadata.Label
                title={title}
                text={formatDateTime(date)}
                icon={
                  index + 1 === raceDates.length ? { source: "flag-checkered.png", tintColor: Color.PrimaryText } : null
                }
              />
              <List.Item.Detail.Metadata.Separator />
            </Fragment>
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default RaceSessionDetails;
