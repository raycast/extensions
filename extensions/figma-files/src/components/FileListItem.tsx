import { ActionPanel, List, CopyToClipboardAction } from "@raycast/api";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

import type { File } from "../types";
import DevelopmentActionSection from "./DevelopmentActionSection";
import { OpenProjectFileAction } from "./OpenProjectFileAction";
import { OpenPageSubmenuAction } from "./OpenPageSubmenuAction";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export default function FileListItem(props: { file: File; extraKey?: string; onVisit: (file: File) => void }) {
  const { file, extraKey, onVisit } = props;

  const accessoryTitle = String(timeAgo.format(new Date(file.last_modified)));
  const fileIdentifier = extraKey ? `${file.key}-${extraKey}` : file.key;
  return (
    <List.Item
      id={fileIdentifier}
      title={file.name}
      icon={file.thumbnail_url}
      accessoryTitle={accessoryTitle}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenProjectFileAction file={props.file} onVisit={onVisit} />
            <CopyToClipboardAction content={`https://figma.com/file/${file.key}`} />
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
