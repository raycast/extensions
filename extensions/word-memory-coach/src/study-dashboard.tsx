import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getDailyLog } from "./storage";
import { exportStudyAudio, generateStudyTextFromWords, getSavedStudyArtifacts } from "./study-service";
import { StudyTextDetail } from "./study-text-detail";
import { DailyWordLog } from "./types";
import { createFallbackStudyText, formatWordSubtitle } from "./word-utils";

export default function StudyDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [dailyLog, setDailyLog] = useState<DailyWordLog | null>(null);
  const [studyText, setStudyText] = useState("");
  const [audioPath, setAudioPath] = useState<string | undefined>();

  async function refresh() {
    setIsLoading(true);
    const [log, artifacts] = await Promise.all([getDailyLog(), getSavedStudyArtifacts()]);

    setDailyLog(log);
    setStudyText(artifacts.text ?? createFallbackStudyText(log.words.map((entry) => entry.word)));
    setAudioPath(artifacts.audioPath);
    setIsLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function generateStudyText(): Promise<string | undefined> {
    if (!dailyLog || dailyLog.words.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No words captured yet",
        message: "Run One-Click Daily Review or copy a new word first.",
      });
      return undefined;
    }

    try {
      const nextText = await generateStudyTextFromWords(dailyLog.words.map((entry) => entry.word));
      setStudyText(nextText);
      await showToast({ style: Toast.Style.Success, title: "Study text is ready" });
      return nextText;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "AI generation failed",
        message: String(error),
      });
      return undefined;
    }
  }

  async function createAudioFromStudyText() {
    if (!studyText.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "No study text to export" });
      return;
    }

    try {
      const nextAudioPath = await exportStudyAudio(studyText);
      setAudioPath(nextAudioPath);
      await showToast({ style: Toast.Style.Success, title: "Audio exported", message: nextAudioPath });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Audio export failed",
        message: String(error),
      });
    }
  }

  const words = dailyLog?.words ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search today's words">
      <List.Section title="Today">
        <List.Item
          title={`${words.length} word${words.length === 1 ? "" : "s"} captured`}
          subtitle={dailyLog ? `Updated ${new Date(dailyLog.updatedAt).toLocaleTimeString()}` : undefined}
          icon={Icon.Book}
          actions={
            <ActionPanel>
              <Action title="Generate Study Text" icon={Icon.Wand} onAction={generateStudyText} />
              <Action title="Export Audio" icon={Icon.Microphone} onAction={createAudioFromStudyText} />
              <Action.Push
                title="Open Study Text"
                icon={Icon.Text}
                target={<StudyTextDetail text={studyText} audioPath={audioPath} />}
              />
              <Action.CopyToClipboard title="Copy Word List" content={words.map((entry) => entry.word).join(", ")} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={refresh} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Study Text Preview"
          subtitle={studyText.slice(0, 80)}
          icon={Icon.Text}
          actions={
            <ActionPanel>
              <Action.Push title="Open Study Text" target={<StudyTextDetail text={studyText} audioPath={audioPath} />} />
              <Action title="Generate Study Text" icon={Icon.Wand} onAction={generateStudyText} />
              <Action title="Export Audio" icon={Icon.Microphone} onAction={createAudioFromStudyText} />
              <Action.CopyToClipboard content={studyText} />
            </ActionPanel>
          }
        />
        {audioPath ? (
          <List.Item
            title="Latest Audio"
            subtitle={audioPath}
            icon={Icon.Music}
            actions={
              <ActionPanel>
                <Action.Open title="Open Audio File" target={audioPath} />
                <Action.ShowInFinder path={audioPath} />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>

      <List.Section title="Words">
        {words.map((entry) => (
          <List.Item
            key={entry.word}
            title={entry.word}
            subtitle={formatWordSubtitle(entry.count, entry.lastSeenAt)}
            accessories={entry.sources.map((source) => ({ text: source === "clipboard" ? "Clipboard" : "History" }))}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={entry.word} />
                <Action.Push title="Open Study Text" target={<StudyTextDetail text={studyText} audioPath={audioPath} />} />
                <Action title="Generate Study Text" onAction={generateStudyText} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
