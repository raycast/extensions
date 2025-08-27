import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import PackageDetail from "./package-detail";
import { PackageResponse, FilterType } from "./types";

export default function Command() {
  const { githubToken, githubOrg, sortBy, npmPackageManager } = getPreferenceValues<{
    githubToken: string;
    githubOrg: string;
    sortBy: string;
    npmPackageManager: string;
  }>();
  const [showFilter, setShowFilter] = useState<FilterType>("npm");

  // Check if required preferences are set
  if (!githubToken || !githubOrg) {
    return (
      <List>
        <List.EmptyView
          title="Missing Required Preferences"
          description="Please set your GitHub API Token and Organization Name in the extension preferences"
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  const { data, isLoading } = useFetch<PackageResponse[]>(
    `https://api.github.com/orgs/${githubOrg}/packages?package_type=${showFilter}`,
    {
      headers: {
        Authorization: "token " + githubToken,
      },
      failureToastOptions: {
        title: "Failed to fetch packages",
        message: "Please check your GitHub token and Organization Name in the preferences",
      },
    },
  );

  function sortPackages(a: PackageResponse, b: PackageResponse) {
    switch (sortBy) {
      case "updated_at":
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case "name":
        return a.name.localeCompare(b.name);
      case "version_count":
        return b.version_count - a.version_count;
      default:
        return 0;
    }
  }

  function getInstallCommand(pack: PackageResponse) {
    switch (pack.package_type) {
      case "npm":
        return `${npmPackageManager} install ${pack.name}`;
      case "rubygems":
        return `gem install ${pack.name}`;
      case "docker":
        return `docker pull ${pack.name}`;
      case "nuget":
        return `dotnet add package ${pack.name}`;
      default:
        return `# Install command not available for package type: ${pack.package_type}`;
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${githubOrg} packages`}
      navigationTitle={`Search ${githubOrg} packages`}
      searchBarAccessory={<FilterDropdown onChange={(value) => setShowFilter(value)} />}
    >
      {data?.sort(sortPackages).map((pack: PackageResponse) => (
        <List.Item
          icon={iconMap[showFilter]}
          title={pack.name}
          key={pack.id}
          subtitle={{ tooltip: "👀 Visibility", value: pack.visibility }}
          accessories={[
            { icon: Icon.Rocket, text: pack.version_count.toString(), tooltip: "Version count" },
            { icon: Icon.Calendar, text: new Date(pack.updated_at).toLocaleString(), tooltip: "Updated at" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<PackageDetail pack={pack} />} />
              <Action.OpenInBrowser url={pack.html_url} />
              <Action.OpenInBrowser title="View Repository" url={pack.repository.html_url} />
              <Action.CopyToClipboard
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                title="Copy Install Command"
                content={getInstallCommand(pack)}
              />
              <Action.Paste
                shortcut={{ modifiers: ["cmd"], key: "v" }}
                title="Paste Install Command"
                content={getInstallCommand(pack)}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title={`No packages found for ${showFilter}`} icon={iconMap[showFilter]} />
    </List>
  );
}

const iconMap: Record<FilterType, Icon> = {
  npm: Icon.Code,
  maven: Icon.Binoculars,
  rubygems: Icon.Globe,
  docker: Icon.Box,
  nuget: Icon.CodeBlock,
};

function FilterDropdown(props: { onChange: (newValue: FilterType) => void }) {
  const { onChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Filter options"
      storeValue={true}
      onChange={(newValue) => {
        onChange(newValue as FilterType);
      }}
    >
      <List.Dropdown.Section title="Filters">
        <List.Dropdown.Item key="npm" title="NPM" value="npm" />
        <List.Dropdown.Item key="maven" title="Maven" value="maven" />
        <List.Dropdown.Item key="rubygems" title="Rubygems" value="rubygems" />
        <List.Dropdown.Item key="docker" title="Docker" value="docker" />
        <List.Dropdown.Item key="nuget" title="Nuget" value="nuget" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
