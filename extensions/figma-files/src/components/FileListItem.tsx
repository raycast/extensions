import { Action, ActionPanel, List } from "@raycast/api";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

import type { File } from "../types";
import DevelopmentActionSection from "./DevelopmentActionSection";
import { OpenProjectFileAction } from "./OpenProjectFileAction";
import { OpenPageSubmenuAction } from "./OpenPageSubmenuAction";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export default function FileListItem(props: {
  file: File;
  extraKey?: string;
  onVisit: (file: File) => void;
  showingDetail: boolean;
}) {
  const { file, extraKey, onVisit, showingDetail } = props;

  const dateUpdated = String(timeAgo.format(new Date(file.last_modified)));
  const fileIdentifier = extraKey ? `${file.key}-${extraKey}` : file.key;
  return (
    <List.Item
      id={fileIdentifier}
      title={file.name}
      icon={file.thumbnail_url}
      accessories={[{ text: showingDetail ? "" : dateUpdated }]}
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
      detail={<List.Item.Detail markdown={`![Thumbnail](${file.thumbnail_url}) \n Last updated: ${dateUpdated}`} />}
    />
  );
}
