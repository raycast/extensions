import { Action, ActionPanel } from "@raycast/api";

export class AwsAction {
  public static Console = ({ url }: { url: string }) => (
    <ActionPanel.Section title="Console">
      <Action.OpenInBrowser key="openConsoleLink" title="Open in Browser" url={url} />
      <Action.CopyToClipboard
        key="copyConsoleLink"
        title="Copy Link"
        content={url}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </ActionPanel.Section>
  );

  public static ExportResponse = ({ response }: { response: unknown }) => (
    <Action.CopyToClipboard
      title="Copy Service Response"
      content={JSON.stringify(response, null, 2)}
      shortcut={{ modifiers: ["opt"], key: "e" }}
    />
  );
}
