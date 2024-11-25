import { ActionPanel, Action, List } from "@raycast/api";
import { SearchList } from "./components/SearchList";
import { getDefaultIcon, getIcon } from "./utils/icons.util";
import type { PortDetails } from "./types";

export default function SearchPorts() {
  const getGithubLink = (portName: string, portDetails: PortDetails) => {
    const repoSlug = portDetails.alias || portName;
    return `https://github.com/catppuccin/${repoSlug}`;
  };

  const renderItem = (portName: string, portDetails: PortDetails) => {
    const githubLink = getGithubLink(portName, portDetails);
    const platform = Array.isArray(portDetails.platform)
      ? portDetails.platform.join(", ")
      : portDetails.platform || "Unknown Platform";

    return (
      <List.Item
        key={portName}
        title={portDetails.name}
        subtitle={`Platforms: ${platform}`}
        accessories={portDetails.categories ? portDetails.categories.map((category) => ({ tag: category })) : undefined}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={githubLink} title="Open GitHub" />
          </ActionPanel>
        }
        icon={{
          value: portDetails.icon ? getIcon(portDetails.icon, portDetails.color) : getDefaultIcon(portDetails.color),
          tooltip: portName,
        }}
      />
    );
  };

  const filterFunction = (name: string, portDetails: PortDetails, searchText: string) => {
    const lowerSearchText = searchText.toLowerCase();
    return name.toLowerCase().includes(lowerSearchText) || portDetails.name.toLowerCase().includes(lowerSearchText);
  };

  return (
    <SearchList<PortDetails>
      dataKey="ports"
      searchBarPlaceholder="Search ports..."
      renderItem={renderItem}
      filterFunction={filterFunction}
    />
  );
}
