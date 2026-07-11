import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

const SETUP_MARKDOWN = `# Set up Gearset Workbench

## 1. Create the API tokens you need

In Gearset, open **My account → Team Management → Access Control → Access token management**. Create a scoped token for each API used by your commands:

- **Automation API** — CI job status, run requests, and cancellation.
- **Reporting API** — pipeline deployment reports.
- **Audit API** — team deployment history and audit reports.

Copy each secret when Gearset displays it. Paste the raw secret into Raycast; do not add the word \`token\`. Raycast stores these values as masked password preferences, and the extension never writes them to logs or history.

## 2. Configure Raycast preferences

Open **Extension Preferences** and add the appropriate token to **Automation API Token**, **Reporting API Token**, or **Audit API Token**.

For CI commands, configure one or more jobs with this format:

\`\`\`text
Example Sandbox|11111111-1111-4111-8111-111111111111|sandbox
\`\`\`

Separate multiple jobs with semicolons. Copy the real job UUID from the Gearset CI dashboard. Mark a job as \`production\` only when its target is Production.

For pipeline reports, copy the pipeline UUID from its Gearset URL into **Default Pipeline ID**.

## 3. Open a command

- Use **Gearset CI Jobs** for configured Automation API jobs.
- Use **Gearset Team Deployment History** with an Audit API token.
- Use **Gearset Pipeline Report** with a Reporting API token and pipeline ID.

Gearset licenses and team permissions remain authoritative. The complete configuration and safety documentation is available through **About This Extension** in Raycast's extension preferences.`;

export function GearsetSetupGuide() {
  return (
    <Detail
      markdown={SETUP_MARKDOWN}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser
            title="Open Gearset Token Instructions"
            url="https://docs.gearset.com/en/articles/6099550-creating-a-gearset-api-access-token"
            icon={Icon.Book}
          />
          <Action.OpenInBrowser
            title="Open Gearset Access Token Management"
            url="https://app.gearset.com/configure"
            icon={Icon.Link}
          />
        </ActionPanel>
      }
    />
  );
}

export function GearsetSetupAction() {
  return <Action.Push title="View Setup Guide" icon={Icon.Book} target={<GearsetSetupGuide />} />;
}
