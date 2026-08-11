import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useNavigation } from "@raycast/api";

type SpaceIdTutorialProps = {
  craftApplicationPath?: string;
};

export default function SpaceIdTutorial({ craftApplicationPath }: SpaceIdTutorialProps) {
  const { pop } = useNavigation();
  const markdown = `
# How to determine your Spaces

You only need this once per Space.

## Quick Steps

1. Open Craft and switch to the Space you want to name.
2. Open any Document in that Space.
3. Right-click any Block.
4. Choose **Copy As** → **Deeplink**.

## Deeplink

The copied deeplink looks like this:

\`\`\`
craftdocs://open?blockId=ABC123&spaceId=1ab23c45-67de-89f0-1g23-hijk456789l0
\`\`\`

The **Space ID** is the value after \`spaceId=\`.

Example:
\`1ab23c45-67de-89f0-1g23-hijk456789l0\`

## Back in Raycast

1. Return to **Manage Spaces**.
2. Find the matching ID.
3. Rename it to something readable.

`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Continue to Manage Spaces" icon={Icon.ArrowLeft} onAction={pop} />
          <Action.Open
            title="Open Craft"
            icon={Icon.AppWindow}
            target="craftdocs://"
            application={craftApplicationPath}
          />
        </ActionPanel>
      }
    />
  );
}
