import { Action, ActionPanel, Application, Grid } from "@raycast/api";
import type { File } from "../types";
import DevelopmentActionSection from "./DevelopmentActionSection";
import { OpenProjectFileAction } from "./OpenProjectFileAction";
import { OpenPageSubmenuAction } from "./OpenPageSubmenuAction";
import { OpenBranchSubmenuAction } from "./OpenBranchSubmenuAction";
import { StarFileAction } from "./StarFileAction";

export default function FileGridItem(props: {
  revalidate: () => void;
  file: File;
  extraKey?: string;
  desktopApp: Application | undefined;
  starredFiles: File[];
  starredFilesCount: number;
  onVisit: (file: File) => void;
}) {
  const { file, extraKey, desktopApp, onVisit, revalidate } = props;
  const fileIdentifier = extraKey ? `${file.key}-${extraKey}` : file.key;
  const isStarred = props.starredFiles.some((item) => item.name === file.name);

  const accessory: Grid.Item.Accessory = {};
  accessory.icon = "branch.svg";
  accessory.tooltip = "File has branches";

  return (
    <Grid.Item
      id={fileIdentifier}
      title={file.name}
      content={{ tooltip: file.name, value: file.thumbnail_url ?? "Missing thumbnail" }}
      accessory={file.branches && accessory}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenProjectFileAction file={props.file} desktopApp={desktopApp} onVisit={onVisit} />
            <Action.CopyToClipboard content={`https://figma.com/file/${file.key}`} />
            <StarFileAction file={props.file} isStarred={isStarred} revalidate={revalidate} />
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
