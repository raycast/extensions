import { Action, ActionPanel, type Application, Grid, Icon } from "@raycast/api";
import type { File } from "../types";
import DevelopmentActionSection from "./DevelopmentActionSection";
import { OpenBranchSubmenuAction } from "./OpenBranchSubmenuAction";
import { OpenPageSubmenuAction } from "./OpenPageSubmenuAction";
import { OpenProjectFileAction } from "./OpenProjectFileAction";
import { StarFileAction } from "./StarFileAction";

export default function FileGridItem(props: {
  revalidate: () => void;
  file: File;
  extraKey?: string;
  desktopApp: Application | undefined;
  starredFiles: File[];
  starredFilesCount: number;
  onVisit: (file: File) => void;
  searchkeywords?: string;
}) {
  const { file, extraKey, desktopApp, onVisit, revalidate, searchkeywords } = props;
  const fileIdentifier = extraKey ? `${file.key}-${extraKey}` : file.key;
  const isStarred = props.starredFiles.some((item) => item.name === file.name);

  const accessory: Grid.Item.Accessory = {};
  accessory.icon = "branch.svg";
  accessory.tooltip = "File has branches";

  return (
    <Grid.Item
      id={fileIdentifier}
      title={file.name}
      subtitle={getRelativeTime(Date.parse(file.last_modified))}
      keywords={[searchkeywords ?? ""]}
      content={{ tooltip: file.name, value: file.thumbnail_url ?? "Missing thumbnail" }}
      accessory={file.branches && accessory}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenProjectFileAction file={props.file} desktopApp={desktopApp} onVisit={onVisit} />
            <Action.CopyToClipboard content={`https://figma.com/file/${file.key}`} />
            {props.starredFilesCount >= 10 && !isStarred ? (
              <Action icon={Icon.ExclamationMark} title="Reached 10 Starred Files Limit" />
            ) : (
              <StarFileAction file={props.file} isStarred={isStarred} revalidate={revalidate} />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            {file.branches && <OpenBranchSubmenuAction file={props.file} desktopApp={desktopApp} />}
            <OpenPageSubmenuAction file={props.file} desktopApp={desktopApp} onVisit={onVisit} />
          </ActionPanel.Section>
          <DevelopmentActionSection />
        </ActionPanel>
      }
    />
  );
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return "Edited just now";
  }

  if (minutes < 60) {
    return `Edited ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  if (hours < 24) {
    return `Edited ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  if (days < 30) {
    return `Edited ${days} ${days === 1 ? "day" : "days"} ago`;
  }

  if (months < 12) {
    return `Edited ${months} ${months === 1 ? "month" : "months"} ago`;
  }

  return `Edited ${years} ${years === 1 ? "year" : "years"} ago`;
}
