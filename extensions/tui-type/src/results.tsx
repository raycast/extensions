import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  useNavigation,
  Color,
} from "@raycast/api";
import { useResults } from "./hooks/store/test/useResults";

interface Props {
  onRestart: () => void;
}

const getRank = (wpm: number) => {
  if (wpm < 20) return { title: "Novice", icon: Icon.Dot, color: Color.Blue };
  if (wpm < 40)
    return { title: "Apprentice", icon: Icon.Pencil, color: Color.Blue };
  if (wpm < 60) return { title: "Scribe", icon: Icon.Book, color: Color.Green };
  if (wpm < 80)
    return { title: "Typist", icon: Icon.Keyboard, color: Color.Green };
  if (wpm < 100)
    return { title: "Speedster", icon: Icon.Bolt, color: Color.Yellow };
  if (wpm < 120)
    return { title: "Machinist", icon: Icon.Gear, color: Color.Orange };
  if (wpm < 150)
    return { title: "Virtuoso", icon: Icon.Star, color: Color.Orange };
  if (wpm < 180)
    return { title: "Prodigy", icon: Icon.Trophy, color: Color.Magenta };
  if (wpm < 210)
    return { title: "Legend", icon: Icon.Airplane, color: Color.Magenta };
  if (wpm < 250)
    return { title: "Mythic", icon: Icon.Rocket, color: Color.Purple };
  if (wpm < 300)
    return { title: "Transcendent", icon: Icon.Stars, color: Color.Purple };
  return { title: "Typing God", icon: Icon.Crown, color: Color.Red };
};

export default function Results({ onRestart }: Props) {
  const { pop } = useNavigation();

  const { correctChars, wrongChars, typedChars, timeInMinutes } = useResults();

  const totalChars = correctChars + wrongChars;

  const netWpm = Math.max(0, Math.round(correctChars / 5 / timeInMinutes)) || 0;
  const rawWpm = Math.round(typedChars / 5 / timeInMinutes) || 0;
  const accuracy =
    totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0;

  const rank = getRank(netWpm);

  const markdown = `
  | Category | Metric | Value |
  | :--- | :--- | :--- |
  | **Speed** | Net WPM | **${netWpm}** |
  | | Raw WPM | ${rawWpm} |
  | **Precision** | Accuracy | **${accuracy}%** |
  | | Correct | ${correctChars} |
  | | Incorrect | ${wrongChars} |
  | **Pacing** | Duration | ${Math.round(timeInMinutes * 60)}s |
  `;

  const copyText = `WPM: ${netWpm} | Acc: ${accuracy}% | Raw: ${rawWpm}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Test Results"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Rank">
            <Detail.Metadata.TagList.Item
              text={rank.title}
              color={rank.color}
              icon={rank.icon}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Net Speed"
            text={`${netWpm} wpm`}
            icon={Icon.Stopwatch}
          />
          <Detail.Metadata.Label
            title="Accuracy"
            text={`${accuracy}%`}
            icon={
              accuracy >= 95
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Warning, tintColor: Color.Orange }
            }
          />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Date"
            text={new Date().toLocaleDateString()}
          />
          <Detail.Metadata.Label
            title="Time"
            text={new Date().toLocaleTimeString()}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Restart Test"
            icon={Icon.RotateClockwise}
            onAction={onRestart}
          />
          <Action.CopyToClipboard
            title="Copy Result"
            content={copyText}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <ActionPanel.Section>
            <Action
              title="Back to Menu"
              icon={Icon.House}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={pop}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
