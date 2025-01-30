import { Action, ActionPanel, Icon } from "@raycast/api";
import FollowUpList from "./FollowUpList";

type SummaryActionsProps = {
  summary?: string;
  ownerProfileUrl: string;
  transcript: string;
  video_url: string;
};

export default function SummaryActions({ summary, ownerProfileUrl, transcript, video_url }: SummaryActionsProps) {
  return (
    <ActionPanel title="Video Actions">
      <Action.Push
        target={<FollowUpList summary={summary} transcript={transcript} />}
        icon={Icon.QuestionMark}
        title="Ask Follow-up Question"
      />
      <Action.CopyToClipboard title="Copy Result" content={summary ?? ""} />
      <Action.OpenInBrowser title="Go to Video" url={video_url} />
      <Action.OpenInBrowser title="Go to Channel" url={ownerProfileUrl} />
    </ActionPanel>
  );
}
