import { PreviewDetail } from "../../../preview/PreviewDetail";
import { LinearProject, LinearProjectState } from "../types";
import { Notification } from "../../../notification";
import { Color, Detail, Image } from "@raycast/api";
import { formatDate } from "../../../utils";

interface LinearProjectPreviewProps {
  notification: Notification;
  linearProject: LinearProject;
}

const STATE_COLOR: Record<LinearProjectState, Color> = {
  [LinearProjectState.Planned]: Color.Blue,
  [LinearProjectState.Backlog]: Color.SecondaryText,
  [LinearProjectState.Started]: Color.Yellow,
  [LinearProjectState.Paused]: Color.Orange,
  [LinearProjectState.Completed]: Color.Green,
  [LinearProjectState.Canceled]: Color.Red,
};

function progressBar(progress: number): string {
  const filled = Math.round(progress / 10);
  return `${"▰".repeat(filled)}${"▱".repeat(10 - filled)} ${progress}%`;
}

export function LinearProjectPreview({ notification, linearProject }: LinearProjectPreviewProps) {
  let markdown = `# ${linearProject.name}`;
  markdown += `\n\n${progressBar(linearProject.progress)}`;
  if (linearProject.description) {
    markdown += `\n\n${linearProject.description}`;
  }

  const metadata = (
    <>
      <Detail.Metadata.TagList title="State">
        <Detail.Metadata.TagList.Item text={linearProject.state} color={STATE_COLOR[linearProject.state]} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Progress" text={`${linearProject.progress}%`} />
      {linearProject.lead ? (
        <Detail.Metadata.Label
          title="Lead"
          text={linearProject.lead.name}
          icon={
            linearProject.lead.avatar_url
              ? { source: linearProject.lead.avatar_url, mask: Image.Mask.Circle }
              : undefined
          }
        />
      ) : null}
      {linearProject.start_date ? (
        <Detail.Metadata.Label title="Start" text={formatDate(linearProject.start_date)} />
      ) : null}
      {linearProject.target_date ? (
        <Detail.Metadata.Label title="Target" text={formatDate(linearProject.target_date)} />
      ) : null}
    </>
  );

  return <PreviewDetail notification={notification} markdown={markdown} metadata={metadata} />;
}
