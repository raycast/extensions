import { Action, ActionPanel, Icon } from "@raycast/api";
import { Question } from "../../hooks/useQuestions";
import FollowUpList from "./FollowUpList";

type SummaryActionsProps = {
  transcript: string;
  summary: string;
  video_url: string;
  ownerProfileUrl: string;
  questions: Question[];
};

export default function SummaryActions({
  transcript,
  summary,
  video_url,
  ownerProfileUrl,
  questions,
}: SummaryActionsProps) {
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
