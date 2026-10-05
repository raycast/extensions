import { Color } from "@raycast/api";
import { ReactNode } from "react";
import { ACTIVITY_DIRECTION_COLORS, ACTIVITY_STATUS_COLORS, parseActivity } from "../lib/activity";
import { formatDate, formatMoney } from "../lib/format";
import { WiseActivity } from "../lib/types";

export interface ActivityMetadataParts {
  Label: (props: { title: string; text: string }) => ReactNode;
  TagList: (props: { title: string; children: ReactNode }) => ReactNode;
  TagListItem: (props: { text: string; color: Color }) => ReactNode;
  Separator: () => ReactNode;
}

interface Props {
  activity: WiseActivity;
  numberFormat: string;
  parts: ActivityMetadataParts;
}

export function ActivityMetadataBody({ activity, numberFormat, parts }: Props) {
  const { direction, primary, secondary } = parseActivity(activity);
  const { Label, TagList, TagListItem, Separator } = parts;

  return (
    <>
      <Label title="Type" text={activity.type} />
      <TagList title="Status">
        <TagListItem text={activity.status} color={ACTIVITY_STATUS_COLORS[activity.status] ?? Color.SecondaryText} />
      </TagList>
      <TagList title="Direction">
        <TagListItem text={direction} color={ACTIVITY_DIRECTION_COLORS[direction]} />
      </TagList>
      <Separator />
      {primary && <Label title="Amount" text={formatMoney(primary.value, primary.currency, numberFormat)} />}
      {secondary && secondary.currency !== primary?.currency && (
        <Label title="Equivalent" text={formatMoney(secondary.value, secondary.currency, numberFormat)} />
      )}
      <Separator />
      <Label title="Date" text={formatDate(activity.createdOn)} />
      {activity.resource && <Label title="Resource" text={`${activity.resource.type} #${activity.resource.id}`} />}
    </>
  );
}
