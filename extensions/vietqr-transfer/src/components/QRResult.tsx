import { Detail, ActionPanel, Action } from "@raycast/api";

export function QRResult(props: { url: string }) {
  return (
    <Detail
      markdown={`![VietQR Payment Code](${props.url})`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy QR Image Link" content={props.url} />
          <Action.OpenInBrowser title="Open in Browser" url={props.url} />
        </ActionPanel>
      }
    />
  );
}
