import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

const BIRD_URL = "https://bird.fast";

const markdown = `# Bird CLI Not Found

The [Bird CLI](${BIRD_URL}) is required for this extension.

## Install

\`\`\`
npm install -g @steipete/bird
\`\`\`

Visit [bird.fast](${BIRD_URL}) for more installation options.

Once installed, you may need to set the **Bird CLI Path** in the extension preferences if it's not in a standard location.
`;

export function BirdNotInstalled() {
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={BIRD_URL} title="Open Bird Website" icon={Icon.Globe} />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content="npm install -g @steipete/bird"
            icon={Icon.Terminal}
          />
        </ActionPanel>
      }
    />
  );
}
