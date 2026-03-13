import { useEffect, useState } from "react";
import { exportAllConfigs } from "./conifgs";
import { Action, ActionPanel, Clipboard, Detail, showHUD } from "@raycast/api";

export default function ExportCommand() {
  const [configsString, setConfigsString] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  useEffect(() => {
    async function f() {
      setConfigsString(await exportAllConfigs());
    }

    f().finally(() => setIsLoading(false));
  }, []);
  const markdown = "```json\n" + configsString + "\n```";
  console.log(markdown);
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy to Clipboard"
            onAction={() => {
              Clipboard.copy(configsString).then(() => showHUD("copied to clipboard"));
            }}
          />
        </ActionPanel>
      }
    />
  );
}
