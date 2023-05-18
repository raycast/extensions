import { Action, ActionPanel, Application, Grid } from "@raycast/api";

import type { File } from "../types";
import DevelopmentActionSection from "./DevelopmentActionSection";
import { OpenProjectFileAction } from "./OpenProjectFileAction";
import { OpenPageSubmenuAction } from "./OpenPageSubmenuAction";
import { OpenBranchSubmenuAction } from "./OpenBranchSubmenuAction";

export default function FileGridItem(props: {
  file: File;
  extraKey?: string;
  desktopApp: Application | undefined;
  onVisit: (file: File) => void;
}) {
  const { file, extraKey, desktopApp, onVisit } = props;
  const fileIdentifier = extraKey ? `${file.key}-${extraKey}` : file.key;

  return (
    <Grid.Item
      id={fileIdentifier}
      title={file.name}
      content={file.thumbnail_url ?? "Missing thumbnail"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenProjectFileAction file={props.file} desktopApp={desktopApp} onVisit={onVisit} />
            <Action.CopyToClipboard content={`https://figma.com/file/${file.key}`} />
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
