import { ActionPanel, CopyToClipboardAction, Icon } from "@raycast/api";
import { ReactElement } from "react";
import { openNewTabWithUrl } from "../common/openNewTab";

export interface UrlActionProps {
  url: string;
  title: string;
}

export const UrlActions = ({ url, title }: UrlActionProps): ReactElement => {
  return (
    <ActionPanel title={title}>
      <ActionPanel.Item title="Open in Browser" onAction={() => openNewTabWithUrl(url)} icon={{ source: Icon.Globe }} />
      <CopyToClipboardAction title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
};
