import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { resolve } from "path";

export function ErrorView({ error }: { error: string | Error }) {
  let errorMarkdown = "# Uh oh!\n";
  errorMarkdown += `![Error message](file://${resolve(
    environment.assetsPath,
    "error.png"
  )})\n`;
  errorMarkdown += "## " + error;
  return (
    <Detail
      markdown={errorMarkdown}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Gear}
            title="Open Extension Preference"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
