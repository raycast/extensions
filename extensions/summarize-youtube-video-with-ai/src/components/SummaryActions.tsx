import { Action, ActionPanel, useNavigation } from "@raycast/api";

type SummaryActionsProps = {
  AskFollowUpQuestion: React.ComponentType<{
    transcript: string;
    setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
    pop: () => void;
  }>;
  markdown?: string;
  ownerProfileUrl: string;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
  transcript: string;
  video_url: string;
};

export default function SummaryActions({
  AskFollowUpQuestion,
  markdown,
  ownerProfileUrl,
  setSummary,
  transcript,
  video_url,
}: SummaryActionsProps) {
  const { pop } = useNavigation();

  return (
    <ActionPanel title="Video Actions">
      <AskFollowUpQuestion transcript={transcript} setSummary={setSummary} pop={pop} />
      <Action.CopyToClipboard title="Copy Result" content={markdown ?? ""} />
      <Action.OpenInBrowser title="Go to Video" url={video_url} />
      <Action.OpenInBrowser title="Go to Channel" url={ownerProfileUrl} />
    </ActionPanel>
  );
}
