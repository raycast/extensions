import { Action, ActionPanel, Detail } from "@raycast/api";
import { useConnectToken } from "./hooks";

export default function Command() {
  const { isLoading, connectToken } = useConnectToken();
  const token = isLoading ? "Loading..." : connectToken;
  const content = `## Connect Token
  ${token}
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
