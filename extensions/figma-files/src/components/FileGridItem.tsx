import { Action, ActionPanel, Application, Grid, Icon } from "@raycast/api";
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
