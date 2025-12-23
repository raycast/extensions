import * as fs from "node:fs";
import path from "node:path";
import { ActionPanel, Action, Detail, getPreferenceValues, openExtensionPreferences, LaunchProps } from "@raycast/api";

import { parseToJSON, findByApiKey } from "./utils";

interface Preferences {
  hockeyStackPath: string;
}

export default function Command(props: LaunchProps<{ arguments: { apikey: string } }>) {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.hockeyStackPath) {
    return (
      <Detail
        markdown="# Please set the HockeyStack App Path in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const apikey = props.arguments.apikey;
  const filePath = path.join(preferences.hockeyStackPath, "domain-info.txt");
  const jsonData = parseToJSON(fs.readFileSync(filePath, "utf8"));
  const result = findByApiKey(apikey, jsonData);

  let markdown;

  if (result) {
    markdown = `## Domain - ${result.name}\n`;
    markdown += `## ${result.domain}`;
  } else {
    markdown = `# Domain not found for API key: ${apikey}`;
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        result ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Domain" content={result.domain} />
            <Action.CopyToClipboard title="Copy Name" content={result.name} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
