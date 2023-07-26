import { Action, ActionPanel, Detail } from "@raycast/api";
import { useConnectToken } from "./hooks";

export default function Command() {
  const { connectToken } = useConnectToken();
  const content = `## Connect Token
  ${connectToken}
  `;
  return (
    connectToken && (
      <Detail
        markdown={content}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Connect Token" content={connectToken} />
          </ActionPanel>
        }
      />
    )
  );
}
