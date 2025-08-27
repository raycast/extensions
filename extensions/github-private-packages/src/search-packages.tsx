import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import PackageDetail from "./package-detail";

export default function Command() {
  const { githubToken, githubOrg, sortBy, npmPackageManager } = getPreferenceValues<{
    githubToken: string;
    githubOrg: string;
    sortBy: string;
    npmPackageManager: string;
  }>();
  const [showFilter, setShowFilter] = useState<FilterType>("npm");

  const { data, isLoading } = useFetch<PackageResponse[]>(
    `https://api.github.com/orgs/${githubOrg}/packages?package_type=${showFilter}`,
    {
      headers: {
        Authorization: "token " + githubToken,
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
    switch (showFilter) {
      case "npm":
        return `${npmPackageManager} install ${pack.name}`;
      case "rubygems":
        return `gem install ${pack.name}`;
      case "docker":
        return `docker pull ${pack.name}`;
      case "nuget":
        return `dotnet add package ${pack.name}`;
      default:
        return "";
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

type FilterType = "npm" | "maven" | "rubygems" | "docker" | "nuget" | "container";

export type PackageResponse = {
  id: number;
  name: string;
  package_type: string;
  owner: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    user_view_type: string;
    site_admin: boolean;
  };
  version_count: number;
  visibility: string;
  url: string;
  created_at: string;
  updated_at: string;
  repository: {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      login: string;
      id: number;
      node_id: string;
      avatar_url: string;
      gravatar_id: string;
      url: string;
      html_url: string;
      followers_url: string;
      following_url: string;
      gists_url: string;
      starred_url: string;
      subscriptions_url: string;
      organizations_url: string;
      repos_url: string;
      events_url: string;
      received_events_url: string;
      type: string;
      user_view_type: string;
      site_admin: boolean;
    };
    html_url: string;
    description: string | null;
    fork: boolean;
    url: string;
    forks_url: string;
    keys_url: string;
    collaborators_url: string;
    teams_url: string;
    hooks_url: string;
    issue_events_url: string;
    events_url: string;
    assignees_url: string;
    branches_url: string;
    tags_url: string;
    blobs_url: string;
    git_tags_url: string;
    git_refs_url: string;
    trees_url: string;
    statuses_url: string;
    languages_url: string;
    stargazers_url: string;
    contributors_url: string;
    subscribers_url: string;
    subscription_url: string;
    commits_url: string;
    git_commits_url: string;
    comments_url: string;
    issue_comment_url: string;
    contents_url: string;
    compare_url: string;
    merges_url: string;
    archive_url: string;
    downloads_url: string;
    issues_url: string;
    pulls_url: string;
    milestones_url: string;
    notifications_url: string;
    labels_url: string;
    releases_url: string;
    deployments_url: string;
  };
  html_url: string;
};

const iconMap: Record<FilterType, Icon> = {
  npm: Icon.Code,
  maven: Icon.Binoculars,
  rubygems: Icon.Globe,
  docker: Icon.Box,
  nuget: Icon.CodeBlock,
  container: Icon.Coin,
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
        <List.Dropdown.Item key="container" title="Container" value="container" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
