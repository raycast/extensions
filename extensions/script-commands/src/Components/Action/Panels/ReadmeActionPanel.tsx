import { ViewReadmeActionItem } from "@components";

import { CompactGroup } from "@models";

import { ActionPanel, OpenInBrowserAction } from "@raycast/api";

import { readmeNormalURL } from "@urls";

import { ShortcutConstants } from "Const";

type Props = {
  group: CompactGroup;
};

export function ReadmeActionPanel({ group }: Props): JSX.Element {
  let normalURL: string | undefined = undefined;
  const readme = group.readme;

  if (readme && readme.length > 0) {
    normalURL = readmeNormalURL(readme);
  }

  return (
    <ActionPanel.Section title="Package Information">
      <ViewReadmeActionItem group={group} />
      {normalURL && <OpenInBrowserAction url={normalURL} shortcut={ShortcutConstants.ViewReadmeInBrowser} />}
    </ActionPanel.Section>
  );
}
