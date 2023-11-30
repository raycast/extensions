import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";

export default function Todoist() {
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");

  const equation = `(${endValue.trim()} - ${startValue.trim()}) ÷ ${startValue.trim()} × 100%`;
  const answer = `${(((Number(endValue) - Number(startValue)) / Number(startValue)) * 100).toFixed(3)}%`;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={answer} />
          <Action.CopyToClipboard title="Copy Question and Answer" content={`${equation} = ${answer}`} />
        </ActionPanel>
      }
    >
      <Form.TextField id="startValue" title="Start Value" value={startValue} onChange={setStartValue} />
      <Form.TextField id="endValue" title="End Value" value={endValue} onChange={setEndValue} />
      <Form.Separator />
      <Form.Description title="Equation" text={equation} />
      <Form.Description title="Answer" text={answer} />
    </Form>
  );
}
