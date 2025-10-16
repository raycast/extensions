import { Action, ActionPanel, Icon } from "@raycast/api";
import type { Question } from "../../hooks/useQuestions";
import FollowUpList from "./FollowUpList";

type SummaryActionsProps = {
  transcript: string;
  summary: string;
  video_url: string;
  ownerProfileUrl: string;
  questions: Question[];
  onQuestionsUpdate?: (updatedQuestions: Question[]) => void;
};

export default function SummaryActions({
  transcript,
  summary,
  video_url,
  ownerProfileUrl,
  questions,
  onQuestionsUpdate,
}: SummaryActionsProps) {
  return (
    <ActionPanel title="Video Actions">
      <Action.Push
        icon={Icon.QuestionMark}
        title="Ask Follow-up Question"
        target={<FollowUpList transcript={transcript} questions={questions} onQuestionsUpdate={onQuestionsUpdate} />}
      />
      <Action.CopyToClipboard title="Copy Summary" content={summary ?? ""} />
      <Action.OpenInBrowser title="Go to Video" url={video_url} />
      <Action.OpenInBrowser title="Go to Channel" url={ownerProfileUrl} />
    </ActionPanel>
  );
}
