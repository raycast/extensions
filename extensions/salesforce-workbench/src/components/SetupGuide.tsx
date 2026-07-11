import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

const SETUP_MARKDOWN = `# Set up Salesforce Workbench

## 1. Install Salesforce CLI

Install the current Salesforce CLI and confirm that the configured executable works:

\`\`\`bash
sf --version
\`\`\`

The default extension preference is \`/usr/local/bin/sf\`. Update **Salesforce CLI Path** if \`sf\` is installed elsewhere.

## 2. Authenticate an org

Open **Salesforce Org Hub** and choose **Add Salesforce Org**, or authenticate in Terminal:

\`\`\`bash
sf org login web --alias ExampleOrg --instance-url https://login.salesforce.com
\`\`\`

Use \`https://test.salesforce.com\` for a sandbox. Existing Salesforce CLI authorizations are reused; the extension never requests or stores an access token.

## 3. Configure preferences

- Choose an **Export Directory** for SOQL CSV files.
- Keep or adjust the history retention settings.
- Optionally add SOSL objects such as \`Custom__c(Name,Status__c)\`.
- Choose the preferred browser used for Salesforce links.

## 4. Choose the active org

Return to **Salesforce Org Hub**, select an authenticated org, and choose **Set as Active Org**. Production orgs are detected from Salesforce's \`isSandbox\` value and receive additional mutation confirmation.

The complete configuration and safety documentation is available through **About This Extension** in Raycast's extension preferences.`;

export function SalesforceSetupGuide() {
  return (
    <Detail
      markdown={SETUP_MARKDOWN}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser
            title="Open Salesforce CLI Documentation"
            url="https://developer.salesforce.com/tools/salesforcecli"
            icon={Icon.Book}
          />
        </ActionPanel>
      }
    />
  );
}

export function SalesforceSetupAction() {
  return <Action.Push title="View Setup Guide" icon={Icon.Book} target={<SalesforceSetupGuide />} />;
}
