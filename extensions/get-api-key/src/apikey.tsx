import * as fs from "node:fs";
import path from "node:path";
import { ActionPanel, Action, Detail, getPreferenceValues, openExtensionPreferences, LaunchProps } from "@raycast/api";

import { parseToJSON, findApiKey } from "./utils";

interface Preferences {
  hockeyStackPath: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Apikey }>) {
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

  const customer = props.arguments.customer;
  const filePath = path.join(preferences.hockeyStackPath, "domain-info.txt");
  const jsonData = parseToJSON(fs.readFileSync(filePath, "utf8"));
  const results = findApiKey(customer, jsonData);

  let markdown;

  if (results.length) {
    markdown = `## API Key - ${results[0].domain}\n`;
    markdown += `## ${results[0].key}`;
  } else {
    markdown = `# API Key not found for ${customer}`;
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        results.length ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Api Key" content={results[0].key} />
          </ActionPanel>
        ) : (
          ""
        )
      }
    />
  );
}
