import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

import { getErrorMessage } from "../helpers/errors";
import { MissingPackagesScopeError, PACKAGES_SCOPE } from "../hooks/useMyPackages";

type PackageListEmptyViewProps = {
  isLoading: boolean;
  error?: unknown;
};

export default function PackageListEmptyView({ isLoading, error }: PackageListEmptyViewProps) {
  if (error instanceof MissingPackagesScopeError) {
    return (
      <List.EmptyView
        icon={Icon.Lock}
        title="Missing Packages Scope"
        description={`Listing packages requires the "${PACKAGES_SCOPE}" scope. Sign out and sign back in, or use a personal access token that has it.`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser
              title="Create a Personal Access Token"
              url={`https://github.com/settings/tokens/new?description=Raycast&scopes=repo,read:org,read:user,project,notifications,${PACKAGES_SCOPE}`}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (error) {
    return <List.EmptyView icon={Icon.Warning} title="Failed to Load Packages" description={getErrorMessage(error)} />;
  }

  if (isLoading) {
    return <List.EmptyView title="Loading packages..." />;
  }

  return (
    <List.EmptyView
      icon={Icon.Box}
      title="No Packages"
      description="You haven't published any package to GitHub Packages yet."
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Learn About GitHub Packages"
            url="https://docs.github.com/en/packages/learn-github-packages/introduction-to-github-packages"
          />
        </ActionPanel>
      }
    />
  );
}
