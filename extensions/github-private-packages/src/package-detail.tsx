import { useFetch } from "@raycast/utils";
import { PackageResponse, VersionResponse } from "./types";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import VersionDetail from "./version-detail";

export default function PackageDetail({ pack }: { pack: PackageResponse }) {
  const { githubToken, npmPackageManager, githubOrg } = getPreferenceValues<{
    githubToken: string;
    githubOrg: string;
    npmPackageManager: string;
  }>();

  const versionsUrl = `https://api.github.com/orgs/${githubOrg}/packages/${pack.package_type}/${pack.name}/versions`;

  const {
    data: versions,
    isLoading,
    error,
  } = useFetch<VersionResponse[]>(versionsUrl, {
    headers: {
      Authorization: "token " + githubToken,
    },
    failureToastOptions: {
      title: "Failed to fetch package versions",
      message: "Please check your GitHub token and Organization Name in the preferences",
    },
  });

  function getInstallCommand(pack: PackageResponse, version: VersionResponse) {
    switch (pack.package_type) {
      case "npm":
        return `${npmPackageManager ?? "npm"} install ${pack.name}@${version.name}`;
      case "rubygems":
        return `gem install ${pack.name} --version ${version.name}`;
      case "docker":
        return `docker pull ${pack.name}:${version.name}`;
      case "nuget":
        return `dotnet add package ${pack.name} --version ${version.name}`;
      case "maven":
        return `mvn install:install-file -Dfile=${pack.name}-${version.name}.jar`;
      default:
        return `# Install command not available for package type: ${pack.package_type}`;
    }
  }

  // Handle API errors
  if (error) {
    return (
      <List
        navigationTitle={`Search ${pack.name} versions`}
        searchBarPlaceholder="Search for a specific package version"
      >
        <List.EmptyView
          title="Failed to load package versions"
          description={error.message || "An error occurred while fetching versions"}
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  // Handle case when versions is null/undefined but not loading
  if (!isLoading && !versions) {
    return (
      <List
        navigationTitle={`Search ${pack.name} versions`}
        searchBarPlaceholder="Search for a specific package version"
      >
        <List.EmptyView
          title="No versions found"
          description={`No versions available for ${pack.name}`}
          icon={Icon.CircleDisabled}
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle={`Search ${pack.name} versions`}
      searchBarPlaceholder="Search for a specific package version"
      isLoading={isLoading}
    >
      <List.Section title={`${pack.name} Versions`}>
        {versions?.map((version) => (
          <List.Item
            title={version.name}
            subtitle={`${pack.name}@${version.name}`}
            key={version.id}
            accessories={[
              { icon: Icon.Calendar, text: new Date(version.updated_at).toLocaleString(), tooltip: "Updated at" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" target={<VersionDetail version={version} pack={pack} />} />
                <Action.OpenInBrowser url={version.html_url} />
                <Action.CopyToClipboard
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  title="Copy Install Command"
                  content={getInstallCommand(pack, version)}
                />
                <Action.Paste
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                  title="Paste Install Command"
                  content={getInstallCommand(pack, version)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && versions && versions.length === 0 && (
        <List.EmptyView
          title={`No versions found for ${pack.name}`}
          description="This package doesn't have any published versions yet"
          icon={Icon.CircleDisabled}
        />
      )}
    </List>
  );
}
