import { ActionPanel, CopyToClipboardAction, Detail, OpenInBrowserAction } from "@raycast/api";

import { CompactGroup } from "@models";

import { useReadme } from "@hooks";

type Props = {
  group: CompactGroup;
};

export function ReadmeDetail({ group }: Props): JSX.Element {
  const { title, isLoading, readmeURL, content } = useReadme(group);

  return (
    <Detail
      navigationTitle={title}
      isLoading={isLoading}
      markdown={content}
      actions={
        <ActionPanel title={title}>
          <ActionsSection url={readmeURL} />
        </ActionPanel>
      }
    />
  );
}

function ActionsSection({ url }: { url: string }): JSX.Element {
  return (
    <ActionPanel.Section>
      <OpenInBrowserAction url={url} />
      <CopyToClipboardAction title="Copy README URL" content={url} />
    </ActionPanel.Section>
  );
}
