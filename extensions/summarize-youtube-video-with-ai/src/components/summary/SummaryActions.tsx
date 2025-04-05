import { Action, ActionPanel, Icon } from "@raycast/api";
import { Question } from "../../hooks/useQuestions";
import FollowUpList from "./FollowUpList";

type SummaryActionsProps = {
  ownerProfileUrl: string;
  questions: Question[];
  summary?: string;
  transcript: string;
  video_url: string;
};

export default function SummaryActions({
  ownerProfileUrl,
  questions,
  summary,
  transcript,
  video_url,
}: SummaryActionsProps) {
  if (!summary) return null;
  return (
    <ActionPanel title="Video Actions">
      <Action.Push
        icon={Icon.QuestionMark}
        title="Ask Follow-up Question"
        target={<FollowUpList transcript={transcript} questions={questions} />}
      />
      <Action.CopyToClipboard title="Copy Summary" content={summary ?? ""} />
      <Action.OpenInBrowser title="Go to Video" url={video_url} />
      <Action.OpenInBrowser title="Go to Channel" url={ownerProfileUrl} />
    </ActionPanel>
  );
}
