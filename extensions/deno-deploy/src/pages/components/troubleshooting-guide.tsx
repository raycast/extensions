import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

const CODE_BACKTICKS = "```";
const GITHUB_CREATE_ISSUE_URL =
  "https://github.com/raycast/extensions/issues/new?assignees=&labels=extension%2Cbug&template=extension_bug_report.yml&title=%5BDeno%20Deploy%5D+...";

const getContent = (errorInfo?: string) => `# 🚨 Something went wrong
${errorInfo ? `${CODE_BACKTICKS}\n${errorInfo}\n${CODE_BACKTICKS}` : "\n"}
## Troubleshooting Guide:

1. Make sure you have set an Access Token in the extension settings. You get one from the [Deno Deploy Dashboard](https://dash.deno.com/account).
2. The Access Token typically starts with "ddp_" and is 40 characters long.

If you are still experiencing issues, please [open an issue on GitHub](${GITHUB_CREATE_ISSUE_URL}).
`;

export type TroubleshootingGuideProps = {
  errorInfo?: string;
};

const TroubleshootingGuide = (props: TroubleshootingGuideProps) => (
  <Detail
    markdown={getContent(props.errorInfo)}
    actions={
      <ActionPanel>
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
      </ActionPanel>
    }
  />
);

export default TroubleshootingGuide;
