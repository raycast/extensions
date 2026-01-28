import { ActionPanel, CopyToClipboardAction, Detail, OpenInBrowserAction } from "@raycast/api";

import { ScriptCommand } from "@models";

import { useSourceCode } from "Hooks/useSourceCode";

type Props = {
  scriptCommand: ScriptCommand;
};

export function SourceCodeDetail({ scriptCommand }: Props): JSX.Element {
  const { title, isLoading, sourceCode, sourceCodeURL } = useSourceCode(scriptCommand);

  return (
    <Detail
      navigationTitle={title}
      isLoading={isLoading}
      markdown={sourceCode}
      actions={
        <ActionPanel title={title}>
          <ActionsSection url={sourceCodeURL} />
        </ActionPanel>
      }
    />
  );
}

function ActionsSection({ url }: { url: string }): JSX.Element {
  return (
    <ActionPanel.Section>
      <OpenInBrowserAction url={url} />
      <CopyToClipboardAction title="Copy Script Command URL" content={url} />
    </ActionPanel.Section>
  );
}
