import { ActionPanel, OpenInBrowserAction } from "@raycast/api";

import { ViewSourceCodeActionItem } from "@components";

import { ScriptCommand } from "@models";

import { ShortcutConstants } from "Const";

type Props = {
  url: string;
  scriptCommand: ScriptCommand;
};

export function ViewsActionPanel({ url, scriptCommand }: Props): JSX.Element {
  return (
    <ActionPanel.Section>
      <ViewSourceCodeActionItem scriptCommand={scriptCommand} />
      <OpenInBrowserAction url={url} shortcut={ShortcutConstants.ViewSourceCodeInBrowser} />
    </ActionPanel.Section>
  );
}
