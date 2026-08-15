import { Color, List } from "@raycast/api";
import { ReactNode } from "react";
import { ActivityMetadataBody } from "./ActivityMetadataBody";
import { parseActivity } from "../lib/activity";
import { WiseActivity } from "../lib/types";

interface Props {
  activity: WiseActivity;
  numberFormat: string;
}

const listMetadataParts = {
  Label: (props: { title: string; text: string }) => <List.Item.Detail.Metadata.Label {...props} />,
  TagList: (props: { title: string; children: ReactNode }) => (
    <List.Item.Detail.Metadata.TagList title={props.title}>{props.children}</List.Item.Detail.Metadata.TagList>
  ),
  TagListItem: (props: { text: string; color: Color }) => (
    <List.Item.Detail.Metadata.TagList.Item text={props.text} color={props.color} />
  ),
  Separator: () => <List.Item.Detail.Metadata.Separator />,
};

export function ActivityItemDetail({ activity, numberFormat }: Props) {
  const { title, description } = parseActivity(activity);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Description" text={title} />
          {description && description !== title && (
            <List.Item.Detail.Metadata.Label title="Details" text={description} />
          )}
          <ActivityMetadataBody activity={activity} numberFormat={numberFormat} parts={listMetadataParts} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
