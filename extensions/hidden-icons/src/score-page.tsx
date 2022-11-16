import { Action, ActionPanel, Detail, Icon, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { getNumberCanvas } from "./utils/common-utils";
import { spawnSync } from "child_process";
import { alertDialog } from "./hooks/hooks";
import { HistoryScore } from "./types/types";
import { ActionOpenPreferences } from "./components/action-open-preferences";

export default function ScorePage(props: { myScore: HistoryScore; historyScore: HistoryScore[] }) {
  const { mode, score } = props.myScore;
  const [scoreCanvas, setScoreCanvas] = useState<string>("");
  const [historyScore, setHistoryScore] = useState<HistoryScore[]>(props.historyScore);
  const [breakRecord, setBreakRecord] = useState<boolean>(false);

  useEffect(() => {
    async function _fetchLifeProgress() {
      setScoreCanvas(getNumberCanvas("simple", score));

      const _newHistoryScore: HistoryScore[] = [];
      let _breakRecord = false;
      historyScore.forEach((value: HistoryScore) => {
        if (value.mode == mode && value.score < score) {
          _newHistoryScore.push({ mode: mode, score: score });
          _breakRecord = true;
        } else {
          _newHistoryScore.push(value);
        }
      });
      setBreakRecord(_breakRecord);
      if (_breakRecord) {
        spawnSync(`open raycast://confetti`, { shell: true });
      }
      await LocalStorage.setItem("HistoryScore", JSON.stringify(_newHistoryScore));
    }

    _fetchLifeProgress().then();
  }, []);

  return (
    <Detail
      markdown={`# **${breakRecord ? "🎉 " : ""}Your Score${breakRecord ? " 🎉" : ""}**  
${mode} Mode

${scoreCanvas} 
`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Highest Score in History" text={`---------------------`} />
          {historyScore.map((historyScore) => {
            return (
              <Detail.Metadata.Label
                key={historyScore.mode}
                title={`${historyScore.mode} Mode`}
                text={historyScore.score + ""}
              />
            );
          })}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={"Clear History Score"}
            onAction={() => {
              alertDialog(
                Icon.ExclamationMark,
                "Clear History Score",
                "Are you sure you want to clear history score?",
                "Clear",
                async () => {
                  await LocalStorage.clear();
                  const _historyScore: HistoryScore[] = [];
                  historyScore.forEach((value) => {
                    _historyScore.push({ mode: value.mode, score: 0 });
                  });
                  setHistoryScore(_historyScore);
                }
              ).then();
            }}
          />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
