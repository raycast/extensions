import { Action, ActionPanel, Grid, Icon, openExtensionPreferences } from "@raycast/api";

interface OnboardingViewProps {
  hasToken?: boolean;
}

export default function OnboardingView({ hasToken = false }: OnboardingViewProps) {
  return (
    <Grid columns={5} inset={Grid.Inset.Large} searchBarPlaceholder="Search images...">
      <Grid.EmptyView
        icon="extension-icon-small.png"
        title="Welcome to GitCDN"
        description={
          hasToken
            ? "Configure your default GitHub repository to get started. Browse images, generate CDN URLs, and manage your repository's images."
            : "Configure your default GitHub repository to get started. Add a GitHub token (optional) to increase rate limits and enable upload/delete features."
        }
        actions={
          <ActionPanel>
            <Action
              title="Configure Repository"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
            {!hasToken && (
              <Action.OpenInBrowser
                title="Create GitHub Token"
                icon={Icon.Link}
                url="https://github.com/settings/tokens"
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            )}
          </ActionPanel>
        }
      />
    </Grid>
  );
}
