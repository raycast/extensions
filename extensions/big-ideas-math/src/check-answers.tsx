import { Detail, LaunchProps, Action, ActionPanel, Toast, showToast, Icon } from "@raycast/api";
import React, { useState } from "react";

export default function Command(props: LaunchProps) {
  const { chapter, section, problem } = props.arguments;
  const [problemChange, setProblemChange] = useState<number>(parseInt(problem));

  const chapterNumber = chapter.toString().padStart(2, "0");
  const sectionNumber = section.toString().padStart(2, "0");
  const problemNumber = problemChange.toString().padStart(3, "0");

  const decreaseProblem = () => {
    if (problemChange > 1) {
      setProblemChange((prevProblem) => prevProblem - 1);
    }
  };

  if (problemChange === 0) {
    showToast({ title: "You may not go below 0.", style: Toast.Style.Failure })
    setProblemChange(1);
    
  }

  return (
    <Detail
      markdown={`![](https://static.bigideasmath.com/protected/content/dc_cc_hs/apt/images/alg2/${chapterNumber}/${sectionNumber}/s_alg2_ex_${chapterNumber}_${sectionNumber}_${problemNumber}.png)`}
      navigationTitle={`Section ${chapterNumber}.${sectionNumber} Problem ${problemNumber}`}
      actions={
        <ActionPanel>
          <Action
            title="Next Problem"
            onAction={() => setProblemChange((prevProblem) => prevProblem + 1)}
            icon={Icon.ChevronRight}
          />
          <Action
            title="Previous Problem"
            onAction={decreaseProblem}
            icon={Icon.ChevronLeft}
          />
          <Action.OpenInBrowser
            url={`https://static.bigideasmath.com/protected/content/dc_cc_hs/apt/images/alg2/${chapterNumber}/${sectionNumber}/s_alg2_ex_${chapterNumber}_${sectionNumber}_${problemNumber}.png`}
          />
        </ActionPanel>
      }
    />
  );
}
