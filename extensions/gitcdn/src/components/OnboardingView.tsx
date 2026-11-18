import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

interface OnboardingViewProps {
  hasToken?: boolean;
}

export default function OnboardingView({ hasToken = false }: OnboardingViewProps) {
  const description = hasToken
    ? "Before you can start using this command, you will need to configure your default GitHub repository in the settings."
    : "Before you can start using this command, you will need to add a few things to the settings, listed below.";

  const markdown = `
# Welcome to GitCDN

${description}

${
  hasToken
    ? ""
    : "## Personal Access Token\n\nAdd a GitHub personal access token to increase rate limits (60/hour → 5000/hour) and enable upload/delete features.\n\n**Token Permissions:**\n- Classic tokens: `repo` scope  \n- Fine-grained tokens: `Contents: Read` (read), `Contents: Write` (upload/delete)\n\n"
}

## Default Repository

Set your default GitHub repository to view files from.

**Format:** \`owner/repo\` or \`https://github.com/owner/repo\`
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Continue"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          {!hasToken && (
            <Action.OpenInBrowser
              title="Create GitHub Token"
              icon={Icon.Link}
              url="https://github.com/settings/personal-access-tokens"
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
