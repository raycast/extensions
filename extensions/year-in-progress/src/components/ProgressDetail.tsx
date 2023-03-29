import { List } from "@raycast/api";
import { Progress } from "../types";
import { formatDate } from "../utils/date";
import { getProgressNumber, getProgressSubtitle } from "../utils/progress";

type ProgressDetailProps = {
  progress: Progress;
};

export default function ProgressDetail({ progress }: ProgressDetailProps) {
  const progressNumber = getProgressNumber(progress);
  const subtitle = getProgressSubtitle(progressNumber);
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={progress.title} />
          <List.Item.Detail.Metadata.Label title="Title In Menu Bar" text={progress.menubarTitle} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Start Date" text={`${formatDate(progress.startDate)}`} />
          <List.Item.Detail.Metadata.Label title="End Date" text={`${formatDate(progress.endDate)}`} />
          <List.Item.Detail.Metadata.Label title="Progress" text={subtitle} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Show in Menu Bar" text={`${progress.showInMenuBar ? "Yes" : "No"}`} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
