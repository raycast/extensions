import { Action, ActionPanel, Detail, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { ActionResult } from "./actions";
import { readFromClipboard } from "./utils";

export type ClipboardActionType = (input: string) => ActionResult;
export type OutputType = "show" | "copyToClipboard";

export default ({
  title,
  action,
  outputType = "show",
}: {
  title: string;
  action: ClipboardActionType;
  outputType?: OutputType;
}) => {
  const [result, setResult] = useState<ActionResult>({ value: "" });

  useEffect(() => {
    performAction().catch(console.log);
  });

  const performAction = async () => {
    const input = await readFromClipboard();
    if (!input) {
      setResult({ error: Error("Empty clipboard") });
      return;
    }
    const result = action(input);
    setResult(result);
  };

  const handleError = async () => {
    if (!result?.error) {
      return;
    }

    await showHUD(result.error.message);
  };

  return (
    <ActionPanel>
      {!result?.error && outputType === "show" && (
        <Action.Push
          title={title}
          target={<DetailView title={title} result={result} />}
        />
      )}

      {!result?.error && outputType === "copyToClipboard" && (
        <Action.CopyToClipboard title={title} content={result.value || ""} />
      )}

      {result?.error && <Action title={title} onAction={handleError} />}
    </ActionPanel>
  );
};

const DetailView = ({
  result,
  title,
}: {
  result: ActionResult;
  title: string;
}) => {
  const content = result.value || "";
  return (
    <Detail
      navigationTitle={title}
      markdown={content}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={content} />
        </ActionPanel>
      }
    />
  );
};
