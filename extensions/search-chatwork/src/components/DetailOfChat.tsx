import { Action, ActionPanel, Detail } from "@raycast/api";

export function DetailOfChat(props: { roomName: string; contents: string; link: string }) {
  function buildMarkDown(roomName: string, contents: string) {
    return `
# room: ${roomName}
${contents}
`;
  }
  return (
    <Detail
      markdown={buildMarkDown(props.roomName, props.contents)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Chatwork" url={props.link} />
          <Action.CopyToClipboard title="Copy URL" content={props.link} />
        </ActionPanel>
      }
    />
  );
}
