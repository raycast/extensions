import { Action, ActionPanel, Detail, Icon, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { runOneClickDailyReview } from "./study-service";

interface ReviewState {
  markdown: string;
  audioPath?: string;
}

export default function OneClickDailyReview() {
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<ReviewState>({
    markdown: "Preparing today's study pack...",
  });

  async function runReview() {
    setIsLoading(true);
    const preferences = getPreferenceValues<Preferences>();

    try {
      const result = await runOneClickDailyReview(preferences.autoLowercase);
      const importedCount = result.captureResult
        ? result.captureResult.addedWords.length + result.captureResult.updatedWords.length
        : 0;

      const markdown = result.words.length > 0
        ? [
            "# Today's Study Pack",
            "",
            `Imported from recent history: ${importedCount}`,
            `Words today: ${result.words.length}`,
            "",
            "## Word List",
            "",
            result.words.join(", "),
            "",
            "## Practice Text",
            "",
            result.text,
            "",
            result.audioPath ? `Audio saved to: \`${result.audioPath}\`` : "Audio was not generated.",
          ].join("\n")
        : [
            "# Today's Study Pack",
            "",
            "No English words were found in today's saved list or recent clipboard history.",
            "",
            "Try copying a word first, then run this command again.",
          ].join("\n");

      setState({
        markdown,
        audioPath: result.audioPath,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Today's review is ready",
        message: result.words.length > 0 ? `${result.words.length} words processed` : "No words found",
      });
    } catch (error) {
      const message = String(error);
      setState({
        markdown: `# Review Failed\n\n${message}`,
      });
      await showToast({
        style: Toast.Style.Failure,
        title: "One-click review failed",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void runReview();
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={state.markdown}
      actions={
        <ActionPanel>
          <Action title="Run Again" icon={Icon.ArrowClockwise} onAction={runReview} />
          {state.audioPath ? <Action.Open title="Open Audio File" target={state.audioPath} /> : null}
          {state.audioPath ? <Action.ShowInFinder path={state.audioPath} /> : null}
        </ActionPanel>
      }
    />
  );
}
