import { Action, ActionPanel } from "@raycast/api";

const ItemActions = ({ route }: { route: string }) => {
  const url = `https://neodb.social${route}`;
  return (
    <ActionPanel>
      {/* eslint-disable-next-line @raycast/prefer-title-case */}
      <Action.OpenInBrowser icon="command-icon.png" title="Open in NeoDB" url={url} />
      <Action.CopyToClipboard title="Copy URL to Clipboard" content={url} />
    </ActionPanel>
  );
};

export default ItemActions;
