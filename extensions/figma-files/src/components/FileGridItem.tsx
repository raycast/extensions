import { Action, ActionPanel, Grid } from "@raycast/api";

import type { File } from "../types";
import DevelopmentActionSection from "./DevelopmentActionSection";
import { OpenProjectFileAction } from "./OpenProjectFileAction";
import { OpenPageSubmenuAction } from "./OpenPageSubmenuAction";

export default function FileGridItem(props: { file: File; extraKey?: string; onVisit: (file: File) => void }) {
  const { file, extraKey, onVisit } = props;
  const fileIdentifier = extraKey ? `${file.key}-${extraKey}` : file.key;

  return (
    <Grid.Item
      id={fileIdentifier}
      title={file.name}
      content={file.thumbnail_url}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenProjectFileAction file={props.file} onVisit={onVisit} />
            <Action.CopyToClipboard content={`https://figma.com/file/${file.key}`} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenPageSubmenuAction file={props.file} onVisit={onVisit} />
          </ActionPanel.Section>
          <DevelopmentActionSection />
        </ActionPanel>
      }
    />
  );
}
