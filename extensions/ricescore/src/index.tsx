import { Form, ActionPanel, CopyToClipboardAction } from "@raycast/api";
import { markdownTable } from "markdown-table";
import { useState } from "react";

function getMarkdown(
  reach: string | undefined,
  impact: string | undefined,
  confidence: string | undefined,
  effort: string | undefined,
  score: string
): string {
  const getOrDefault = (num: string | undefined): string => {
    if (num) {
      return num;
    } else {
      return " ";
    }
  };
  getOrDefault(reach);
  return markdownTable(
    [
      ["Reach", "Impact", "Confidence", "Effort", "RICE score"],
      [getOrDefault(reach), getOrDefault(impact), getOrDefault(confidence), getOrDefault(effort), score],
    ],
    { align: ["c", "c", "c", "c", "c"] }
  );
}

export default function Command() {
  const [reach, setReach] = useState<string>();
  const [impact, setImpact] = useState<string>();
  const [confidence, setConfidence] = useState<string>();
  const [effort, setEffort] = useState<string>();

  const reachNum = parseFloat(reach || "");
  const impactNum = parseFloat(impact || "");
  const confidenceNum = parseFloat(confidence || "");
  const effortNum = parseFloat(effort || "");
  const score = (reachNum * impactNum * (confidenceNum / 100.0)) / effortNum;
  const roundScore = Math.round(score * 100.0) / 100.0;
  const isValid = !Number.isNaN(roundScore);
  const scoreText = isValid ? roundScore.toString() : "Invalid input";

  const md = getMarkdown(reach, impact, confidence, effort, scoreText);

  return (
    <Form
      actions={
        <ActionPanel>
          {isValid && <CopyToClipboardAction title="Copy RICE score to Clipboard" content={scoreText} />}
          {isValid && <CopyToClipboardAction title="Copy RICE score markdown to Clipboard" content={md} />}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="reach"
        title="Reach"
        onChange={setReach}
        placeholder="How many people will this impact?"
        defaultValue={reach}
      />
      <Form.TextField
        id="impact"
        title="Impact"
        onChange={setImpact}
        placeholder="3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal"
        defaultValue={impact}
      />
      <Form.TextField
        id="confidence"
        title="Confidence"
        onChange={setConfidence}
        placeholder="100 = high, 80 = medium, 50 = low"
        defaultValue={confidence}
      />
      <Form.TextField
        id="effort"
        title="Effort"
        onChange={setEffort}
        placeholder="How many “person-months” will this take?"
        defaultValue={effort}
      />
      <Form.TextField id="score" title="RICE score" value={scoreText} />
    </Form>
  );
}
