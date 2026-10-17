import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { ReactNode } from "react";
import { ActivityMetadataBody } from "./ActivityMetadataBody";
import { formatSignedPrimaryAmount, parseActivity } from "../lib/activity";
import { formatDate } from "../lib/format";
import { WiseActivity } from "../lib/types";

interface Props {
  activity: WiseActivity;
  numberFormat: string;
}

const detailMetadataParts = {
  Label: (props: { title: string; text: string }) => <Detail.Metadata.Label {...props} />,
  TagList: (props: { title: string; children: ReactNode }) => (
    <Detail.Metadata.TagList title={props.title}>{props.children}</Detail.Metadata.TagList>
  ),
  TagListItem: (props: { text: string; color: Color }) => (
    <Detail.Metadata.TagList.Item text={props.text} color={props.color} />
  ),
  Separator: () => <Detail.Metadata.Separator />,
};

export function ActivityDetail({ activity, numberFormat }: Props) {
  const { direction, title, description, primary } = parseActivity(activity);
  const amountStr = formatSignedPrimaryAmount(direction, primary, activity.primaryAmount, numberFormat);

  const markdown = [
    `# ${title}`,
    description ? `\n> ${description}` : "",
    "",
    `## ${amountStr}`,
    "",
    `*${formatDate(activity.createdOn)}*`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <ActivityMetadataBody activity={activity} numberFormat={numberFormat} parts={detailMetadataParts} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Amount" content={amountStr} />
          <Action.CopyToClipboard title="Copy Title" content={title} />
          <Action.OpenInBrowser title="Open Wise.com" url="https://wise.com/all-transactions" />
        </ActionPanel>
      }
    />
  );
}
