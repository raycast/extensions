import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { BirdNotInstalled } from "./components/BirdNotInstalled";
import { getBirdPath, isBirdInstalled } from "./hooks/useBirdCommand";

export default function CheckCommand() {
  const birdBin = getBirdPath();
  const installed = isBirdInstalled();
  const { isLoading, data, error } = useExec(birdBin, ["check", "--plain"], { execute: installed });

  if (!installed) return <BirdNotInstalled />;

  let markdown = "## Credential Check\n\n---\n\n";

  if (error) {
    markdown += `❌ **Error:** ${error.message}`;
  } else if (data) {
    markdown += "```\n" + data + "\n```";
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url="https://x.com" title="Open X" icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
}
