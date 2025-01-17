import { Action, ActionPanel } from "@raycast/api";

type SummaryActionsProps = {
  transcript?: string;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
  markdown?: string;
  video_url: string;
  ownerProfileUrl: string;
  AskFollowUpQuestion: JSX.Element;
};

export default function SummaryActions({
  markdown,
  video_url,
  ownerProfileUrl,
  AskFollowUpQuestion,
}: SummaryActionsProps) {
  return (
    <ActionPanel title="Video Actions">
      {AskFollowUpQuestion}
      <Action.CopyToClipboard title="Copy Result" content={markdown ?? ""} />
      <Action.OpenInBrowser title="Go to Video" url={video_url} />
      <Action.OpenInBrowser title="Go to Channel" url={ownerProfileUrl} />
    </ActionPanel>
  );
}
