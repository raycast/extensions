import { Action, ActionPanel, Clipboard, Detail, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { toBranchName } from "./generate-branch-name/toBranchName";

export default function GenerateBranchName() {
  const [input, setInput] = useState("");

  useEffect(() => {
    Clipboard.readText().then((rawText) => {
      const text = rawText?.trim().substring(0, 50);
      setInput(text || "");
    });
  }, []);

  const branchName = toBranchName(input || "default-branch-name");

  const body = `${!input ? "\n**⚠️ Clipboard is empty! Please copy some text first.**\n" : ""}\n\n`;
  const text = `**Clipboard:**\n\n${input ? input : "EMPTY"}\n\n 
**Branch Name:**\n\n\`${branchName}\``;

  return (
    <Detail
      markdown={body + input ? text : ""}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url="https://github.com/pulls" title="🌍 Open Pr in Browser" />
          {!input && (
            <Action.CopyToClipboard
              title="Copy Branch Name"
              content={branchName}
              onCopy={() => showHUD("Copied branch name!")}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
