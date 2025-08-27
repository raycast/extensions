import { useFetch } from "@raycast/utils";
import { PackageResponse } from "./search-packages";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import VersionDetail from "./version-detail";

export default function PackageDetail({ pack }: { pack: PackageResponse }) {
  const { githubToken, npmPackageManager } = getPreferenceValues<{
    githubToken: string;
    githubOrg: string;
    npmPackageManager: string;
  }>();
  const { data: versions, isLoading } = useFetch<VersionResponse[]>(`${pack.url}/versions`, {
    headers: {
      Authorization: "token " + githubToken,
    },
  });

  function getInstallCommand(pack: PackageResponse, version: VersionResponse) {
    switch (pack.package_type) {
      case "npm":
        return `${npmPackageManager} install ${pack.name}@${version.name}`;
      case "rubygems":
        return `gem install ${pack.name}@${version.name}`;
      case "docker":
        return `docker pull ${pack.name}@${version.name}`;
      case "nuget":
        return `dotnet add package ${pack.name}@${version.name}`;
      default:
        return "";
    }
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
    </List>
  );
}

export type VersionResponse = {
  id: number;
  name: string;
  url: string;
  package_html_url: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  metadata: {
    package_type: string;
    container: {
      tags: string[];
    };
  };
};
