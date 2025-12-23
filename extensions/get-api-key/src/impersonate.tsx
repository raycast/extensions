import * as fs from "node:fs";
import path from "node:path";
import { ActionPanel, Action, Detail, getPreferenceValues, openExtensionPreferences, LaunchProps } from "@raycast/api";

import { parseToJSON, findApiKey } from "./utils";

interface Preferences {
  hockeyStackPath: string;
}

export default function Command(props: LaunchProps<{ arguments: { customer: string } }>) {
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

  // const customers = await getCustomers();
  // const selectedCustomer = customers.find(c => c.value === props.arguments.customer);

  const customer = props.arguments.customer;
  const filePath = path.join(preferences.hockeyStackPath, "domain-info.txt");
  const jsonData = parseToJSON(fs.readFileSync(filePath, "utf8"));
  const results = findApiKey(customer, jsonData);

  let markdown;

  if (results.length) {
    markdown = `## Found customer to impersonate ${results[0].domain}\n`;
    markdown += `## ${results[0].key}`;
  } else {
    markdown = `# No customer found to impersonate: ${customer}`;
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Customer"
            url={`https://app.hockeystack.com/sharing/${results[0].key}/dashboard/home`}
          />
        </ActionPanel>
      }
    />
  );
}
