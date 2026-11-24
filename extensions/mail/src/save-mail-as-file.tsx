import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { saveSelectedMail } from "./utils/export-mail";

export default function Command() {
  const [progress, setProgress] = useState("The selected email is being exported.");
  const { data, error, isLoading } = usePromise(saveSelectedMail, [setProgress], { onError: () => undefined });
  const report = data || error?.message;
  const markdown = report
    ? `# The EML export failed\n\nChoose **Copy Error** or press **⌘C** to copy the full report.\n\n${report
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n")}`
    : progress;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        report ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Error" content={report} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
