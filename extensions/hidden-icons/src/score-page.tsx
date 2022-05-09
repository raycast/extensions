import { Detail, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { getNumberCanvas } from "./utils/common-utils";
import { HistoryScore } from "./utils/find-icons-utils";

export default function ScorePage(props: { myScore: HistoryScore; historyScore: HistoryScore[] }) {
  const { mode, score } = props.myScore;
  const historyScore = props.historyScore;
  const [scoreCanvas, setScoreCanvas] = useState<string>("");
  const [breakRecord, setBreakRecord] = useState<boolean>(false);

  useEffect(() => {
    async function _fetchLifeProgress() {
      setScoreCanvas(getNumberCanvas("simple", score));

      const _newHistoryScore: HistoryScore[] = [];
      historyScore.forEach((value: HistoryScore) => {
        if (value.mode == mode && value.score < score) {
          _newHistoryScore.push({ mode: mode, score: score });
          setBreakRecord(true);
        } else {
          _newHistoryScore.push(value);
        }
      });
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
    />
  );
}
